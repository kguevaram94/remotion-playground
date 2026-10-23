#!/usr/bin/env python3
"""External one-shot supervisor for Chatterbox CLI (mode A).

Spawns ``synthesize.py`` in a new process group with a global wall-clock
timeout and an RSS ceiling. Stdlib + OS tools only. Never passes ``--force``.
Does not install deps, download models, or run inference by itself.

RSS note: sampled process RSS (e.g. Darwin ``ps -o rss=``) is an
approximation of resident memory for the leader PID — not an exact bound on
Apple Silicon unified memory / GPU allocations.
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any, Callable, Sequence

# Defaults aligned with T-CHATTERBOX-002 mode-A design.
DEFAULT_TIMEOUT_S = 300.0
DEFAULT_RSS_LIMIT_GIB = 16.0
DEFAULT_SAMPLE_INTERVAL_S = 1.0
DEFAULT_GRACE_S = 2.0
DEFAULT_CAPTURE_CAP_BYTES = 64 * 1024
DEFAULT_LOG_TAIL_CHARS = 512

EXIT_OK = 0
EXIT_CHILD_FAIL = 1
EXIT_SUPERVISOR_ERROR = 2
EXIT_PRE_SPAWN = 3
EXIT_TIMEOUT = 4
EXIT_RSS = 5
EXIT_SUPERVISOR_SIGNAL = 6

GIB = 1024 ** 3


def rss_limit_bytes(gib: float) -> int:
    return int(gib * GIB)


def sample_rss_bytes(pid: int) -> int | None:
    """Return RSS in bytes for ``pid``, or None if the process is gone/unreadable.

    Darwin ``ps -o rss=`` reports kilobytes. Other platforms: best-effort via ps.
    """
    try:
        proc = subprocess.run(
            ["ps", "-o", "rss=", "-p", str(pid)],
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return None
    if proc.returncode != 0:
        return None
    raw = (proc.stdout or "").strip()
    if not raw:
        return None
    try:
        # First token in case of whitespace; value is KB on macOS/Linux ps.
        kb = int(raw.split()[0])
    except ValueError:
        return None
    if kb < 0:
        return None
    return kb * 1024


def build_child_argv(
    *,
    python: str,
    script: str,
    text: str,
    ref: str,
    ckpt_dir: str,
    output: str,
    device: str,
    meta_out: str | None,
    language_id: str | None = None,
    exaggeration: float | None = None,
    cfg_weight: float | None = None,
    temperature: float | None = None,
) -> list[str]:
    """Assemble synthesize.py argv. Never includes ``--force``."""
    argv = [
        python,
        script,
        "--text",
        text,
        "--ref",
        ref,
        "--ckpt-dir",
        ckpt_dir,
        "--output",
        output,
        "--device",
        device,
    ]
    if meta_out is not None:
        argv.extend(["--meta-out", meta_out])
    if language_id is not None:
        argv.extend(["--language-id", language_id])
    if exaggeration is not None:
        argv.extend(["--exaggeration", str(exaggeration)])
    if cfg_weight is not None:
        argv.extend(["--cfg-weight", str(cfg_weight)])
    if temperature is not None:
        argv.extend(["--temperature", str(temperature)])
    if "--force" in argv:
        raise RuntimeError("internal error: --force must never appear in child argv")
    return argv


def _drain_pipe(
    pipe: Any,
    sink: bytearray,
    cap: int,
    total_bytes: list[int],
) -> None:
    """Read pipe until EOF; retain only the last ``cap`` bytes in ``sink``.

    ``total_bytes[0]`` accumulates every byte read (true stream size). ``sink``
    is a rolling window of the stream tail, never larger than ``cap``.
    """
    try:
        while True:
            chunk = pipe.read(4096)
            if not chunk:
                break
            total_bytes[0] += len(chunk)
            sink.extend(chunk)
            overflow = len(sink) - cap
            if overflow > 0:
                del sink[:overflow]
    except (OSError, ValueError):
        pass
    finally:
        try:
            pipe.close()
        except Exception:
            pass


def _kill_process_group(pgid: int, sig: int) -> None:
    try:
        os.killpg(pgid, sig)
    except ProcessLookupError:
        pass
    except PermissionError:
        # Fall back to leader only.
        try:
            os.kill(pgid, sig)
        except (ProcessLookupError, PermissionError):
            pass


def terminate_process_group(
    pgid: int,
    *,
    grace_s: float,
    still_alive: Callable[[], bool],
    sleep_fn: Callable[[float], None] = time.sleep,
) -> str:
    """SIGTERM the group; after grace, SIGKILL if still alive. Return last signal name."""
    _kill_process_group(pgid, signal.SIGTERM)
    deadline = time.monotonic() + grace_s
    while still_alive() and time.monotonic() < deadline:
        sleep_fn(0.05)
    if still_alive():
        _kill_process_group(pgid, signal.SIGKILL)
        return "SIGKILL"
    return "SIGTERM"


def write_run_log(path: Path, payload: dict[str, Any]) -> None:
    """Write JSON run log via tempfile + replace. Caller must ensure path is new."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{os.getpid()}.{time.time_ns()}.tmp")
    try:
        tmp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        os.replace(str(tmp), str(path))
    except Exception:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass
        raise


def _tail_text(data: bytes, max_chars: int) -> str:
    text = data.decode("utf-8", errors="replace")
    if len(text) <= max_chars:
        return text
    return text[-max_chars:]


class SuperviseResult:
    __slots__ = (
        "supervisor_exit",
        "payload",
    )

    def __init__(self, supervisor_exit: int, payload: dict[str, Any]) -> None:
        self.supervisor_exit = supervisor_exit
        self.payload = payload


def supervise(
    *,
    python: str,
    script: str,
    text: str,
    ref: str,
    ckpt_dir: str,
    output: str,
    device: str = "mps",
    meta_out: str | None = None,
    run_log: str | None = None,
    timeout_s: float = DEFAULT_TIMEOUT_S,
    rss_limit_gib: float = DEFAULT_RSS_LIMIT_GIB,
    sample_interval_s: float = DEFAULT_SAMPLE_INTERVAL_S,
    grace_s: float = DEFAULT_GRACE_S,
    capture_cap_bytes: int = DEFAULT_CAPTURE_CAP_BYTES,
    log_tail_chars: int = DEFAULT_LOG_TAIL_CHARS,
    language_id: str | None = None,
    exaggeration: float | None = None,
    cfg_weight: float | None = None,
    temperature: float | None = None,
    sample_rss_fn: Callable[[int], int | None] = sample_rss_bytes,
    popen_fn: Callable[..., subprocess.Popen[Any]] = subprocess.Popen,
    sleep_fn: Callable[[float], None] = time.sleep,
    monotonic_fn: Callable[[], float] = time.monotonic,
) -> SuperviseResult:
    """Run one supervised synthesize child. Never deletes existing dirs/files."""
    out_path = Path(output)
    meta_path = Path(meta_out) if meta_out else None
    log_path = Path(run_log) if run_log else None

    def _fail_pre(reason: str, detail: str) -> SuperviseResult:
        payload: dict[str, Any] = {
            "ok": False,
            "termination_reason": reason,
            "detail": detail,
            "exit_code": None,
            "signal": None,
            "duration_s": 0.0,
            "peak_rss_bytes": 0,
            "rss_limit_bytes": rss_limit_bytes(rss_limit_gib),
            "timeout_s": timeout_s,
            "device_requested": device,
            "output": str(out_path),
            "meta_out": str(meta_path) if meta_path else None,
            "run_log": str(log_path) if log_path else None,
            "text_chars": len(text),
            "force_passed": False,
            "rss_metric_note": (
                "RSS is sampled process resident set (approx); "
                "not an exact unified-memory / GPU limit"
            ),
        }
        if log_path is not None and reason not in (
            "run_log_exists",
            "run_log_is_directory",
        ):
            # Only write log when the log path itself was the problem-free dest.
            if not log_path.exists():
                try:
                    write_run_log(log_path, payload)
                except OSError:
                    pass
        return SuperviseResult(EXIT_PRE_SPAWN, payload)

    if out_path.exists():
        return _fail_pre(
            "output_exists",
            f"output already exists (refusing to spawn; no --force): {out_path}",
        )
    if meta_path is not None and meta_path.exists():
        return _fail_pre(
            "meta_exists",
            f"meta-out already exists (refusing to spawn; no --force): {meta_path}",
        )
    if log_path is not None and log_path.is_dir():
        return _fail_pre(
            "run_log_is_directory",
            f"run-log path is a directory (refusing to spawn): {log_path}",
        )
    if log_path is not None and log_path.exists():
        return _fail_pre(
            "run_log_exists",
            f"run-log already exists (refusing to spawn; no overwrite): {log_path}",
        )

    # Create parent dirs only; never delete existing trees.
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if meta_path is not None:
        meta_path.parent.mkdir(parents=True, exist_ok=True)
    if log_path is not None:
        log_path.parent.mkdir(parents=True, exist_ok=True)

    argv = build_child_argv(
        python=python,
        script=script,
        text=text,
        ref=ref,
        ckpt_dir=ckpt_dir,
        output=str(out_path),
        device=device,
        meta_out=str(meta_path) if meta_path else None,
        language_id=language_id,
        exaggeration=exaggeration,
        cfg_weight=cfg_weight,
        temperature=temperature,
    )

    t0 = monotonic_fn()
    peak_rss = 0
    termination_reason = "child_exit"
    last_kill_signal: str | None = None
    rss_ceiling = rss_limit_bytes(rss_limit_gib)

    # Signal state: handlers only set flags; termination runs on the main path.
    stop_requested = threading.Event()
    first_signum: list[int | None] = [None]
    terminate_started = False

    def _on_supervisor_signal(signum: int, _frame: Any) -> None:
        # Minimal: record once and wake the main loop. No wait / kill / I/O here.
        if first_signum[0] is None:
            first_signum[0] = signum
        stop_requested.set()

    previous_handlers: dict[int, Any] = {}
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            previous_handlers[sig] = signal.signal(sig, _on_supervisor_signal)
        except (ValueError, OSError):
            # Not in main thread or unsupported — tests may inject interrupts.
            pass

    child: subprocess.Popen[Any] | None = None
    stdout_thread: threading.Thread | None = None
    stderr_thread: threading.Thread | None = None
    stdout_buf = bytearray()
    stderr_buf = bytearray()
    stdout_total = [0]
    stderr_total = [0]

    def _base_payload(**extra: Any) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "ok": False,
            "termination_reason": termination_reason,
            "exit_code": None,
            "signal": None,
            "duration_s": round(monotonic_fn() - t0, 3),
            "peak_rss_bytes": peak_rss,
            "rss_limit_bytes": rss_ceiling,
            "timeout_s": timeout_s,
            "device_requested": device,
            "output": str(out_path),
            "meta_out": str(meta_path) if meta_path else None,
            "run_log": str(log_path) if log_path else None,
            "text_chars": len(text),
            "python": python,
            "script": script,
            "force_passed": False,
            "child_argv_has_force": False,
            "rss_metric_note": (
                "RSS is sampled process resident set (approx); "
                "not an exact unified-memory / GPU limit"
            ),
        }
        payload.update(extra)
        return payload

    def _begin_terminate(reason: str) -> None:
        """Start group termination at most once (main flow only)."""
        nonlocal terminate_started, termination_reason, last_kill_signal
        if terminate_started or child is None:
            return
        terminate_started = True
        termination_reason = reason
        last_kill_signal = terminate_process_group(
            child.pid,
            grace_s=grace_s,
            still_alive=lambda: child is not None and child.poll() is None,
            sleep_fn=sleep_fn,
        )

    try:
        # Handlers are already installed: a signal here cannot orphan a child
        # that does not yet exist. If the flag is set, skip spawn entirely.
        if stop_requested.is_set():
            termination_reason = "supervisor_signal"
            payload = _base_payload(
                detail="signal received before child spawn",
                signal=(
                    signal.Signals(first_signum[0]).name
                    if first_signum[0] is not None
                    else "SIGTERM"
                ),
            )
            if log_path is not None:
                write_run_log(log_path, payload)
            return SuperviseResult(EXIT_SUPERVISOR_SIGNAL, payload)

        try:
            child = popen_fn(
                argv,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True,
                shell=False,
            )
        except OSError as exc:
            payload = _base_payload(
                termination_reason="spawn_error",
                detail=f"{type(exc).__name__}: {exc}",
            )
            if log_path is not None:
                write_run_log(log_path, payload)
            return SuperviseResult(EXIT_SUPERVISOR_ERROR, payload)

        # If a signal arrived during popen_fn, terminate immediately — handlers
        # were already active, so there is no unhandled orphan window.
        if stop_requested.is_set():
            _begin_terminate("supervisor_signal")

        stdout_thread = threading.Thread(
            target=_drain_pipe,
            args=(child.stdout, stdout_buf, capture_cap_bytes, stdout_total),
            daemon=True,
        )
        stderr_thread = threading.Thread(
            target=_drain_pipe,
            args=(child.stderr, stderr_buf, capture_cap_bytes, stderr_total),
            daemon=True,
        )
        stdout_thread.start()
        stderr_thread.start()

        while child.poll() is None:
            if stop_requested.is_set():
                _begin_terminate("supervisor_signal")
                break

            elapsed = monotonic_fn() - t0
            if elapsed >= timeout_s:
                _begin_terminate("timeout")
                break

            rss = sample_rss_fn(child.pid)
            if rss is not None:
                if rss > peak_rss:
                    peak_rss = rss
                if rss >= rss_ceiling:
                    _begin_terminate("rss_limit")
                    break

            sleep_fn(sample_interval_s)
            # Re-check immediately after sleep: a signal may have arrived while
            # sleeping; do not wait another full sample interval.
            if stop_requested.is_set() and child.poll() is None:
                _begin_terminate("supervisor_signal")
                break

        # Keep handlers installed through wait + final log write so a late
        # signal cannot fall through to the default handler and orphan the child.
        returncode = child.wait()
        if stdout_thread is not None:
            stdout_thread.join(timeout=1.0)
        if stderr_thread is not None:
            stderr_thread.join(timeout=1.0)
        duration = round(monotonic_fn() - t0, 3)

        # Negative returncode on POSIX means killed by signal (-N).
        exit_code: int | None
        signal_name: str | None
        if returncode is not None and returncode < 0:
            exit_code = None
            sig_num = -returncode
            try:
                signal_name = signal.Signals(sig_num).name
            except ValueError:
                signal_name = f"signal_{sig_num}"
        else:
            exit_code = returncode
            signal_name = last_kill_signal if termination_reason != "child_exit" else None

        if termination_reason == "child_exit" and exit_code == 0:
            ok = True
            supervisor_exit = EXIT_OK
        elif termination_reason == "timeout":
            ok = False
            supervisor_exit = EXIT_TIMEOUT
        elif termination_reason == "rss_limit":
            ok = False
            supervisor_exit = EXIT_RSS
        elif termination_reason == "supervisor_signal":
            ok = False
            supervisor_exit = EXIT_SUPERVISOR_SIGNAL
        else:
            ok = False
            supervisor_exit = EXIT_CHILD_FAIL

        payload = {
            "ok": ok,
            "termination_reason": termination_reason,
            "exit_code": exit_code,
            "signal": signal_name,
            "duration_s": duration,
            "peak_rss_bytes": peak_rss,
            "rss_limit_bytes": rss_ceiling,
            "timeout_s": timeout_s,
            "device_requested": device,
            "output": str(out_path),
            "meta_out": str(meta_path) if meta_path else None,
            "run_log": str(log_path) if log_path else None,
            "text_chars": len(text),
            "python": python,
            "script": script,
            "force_passed": False,
            "child_argv_has_force": False,
            "child_stdout_bytes": stdout_total[0],
            "child_stderr_bytes": stderr_total[0],
            "child_stdout_tail": _tail_text(bytes(stdout_buf), log_tail_chars),
            "child_stderr_tail": _tail_text(bytes(stderr_buf), log_tail_chars),
            "rss_metric_note": (
                "RSS is sampled process resident set (approx); "
                "not an exact unified-memory / GPU limit"
            ),
        }

        if log_path is not None:
            write_run_log(log_path, payload)

        return SuperviseResult(supervisor_exit, payload)
    finally:
        # Restore previous handlers only after wait + final log attempt complete
        # (or after an early return that never leaves a live supervised child).
        for sig, handler in previous_handlers.items():
            try:
                signal.signal(sig, handler)
            except (ValueError, OSError):
                pass


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="supervise_oneshot.py",
        description=(
            "Supervise a single tools/chatterbox/synthesize.py run "
            "(timeout + RSS ceiling; never passes --force)."
        ),
    )
    p.add_argument("--python", required=True, help="Python interpreter for the child.")
    p.add_argument(
        "--script",
        default="tools/chatterbox/synthesize.py",
        help="Path to synthesize.py",
    )
    text = p.add_mutually_exclusive_group(required=True)
    text.add_argument("--text", default=None, help="Text to synthesize (not logged in full).")
    text.add_argument(
        "--text-file",
        default=None,
        help="Read text from file (preferred; content not copied into run-log).",
    )
    p.add_argument("--ref", required=True, help="Reference WAV path.")
    p.add_argument("--ckpt-dir", required=True, help="Local es-es checkpoint directory.")
    p.add_argument("--output", "-o", required=True, help="New output WAV path (must not exist).")
    p.add_argument("--meta-out", default=None, help="Optional new JSON meta path.")
    p.add_argument(
        "--run-log",
        default=None,
        help="Optional new supervisor JSON log path (must not exist).",
    )
    p.add_argument(
        "--device",
        default="mps",
        choices=("auto", "mps", "cpu", "cuda"),
        help="Passed through to synthesize.py (default: mps).",
    )
    p.add_argument(
        "--timeout-s",
        type=float,
        default=DEFAULT_TIMEOUT_S,
        help=f"Global wall timeout in seconds (default {DEFAULT_TIMEOUT_S}).",
    )
    p.add_argument(
        "--rss-limit-gib",
        type=float,
        default=DEFAULT_RSS_LIMIT_GIB,
        help=(
            f"RSS ceiling in GiB for the leader process (default {DEFAULT_RSS_LIMIT_GIB}). "
            "Approximate; not unified-memory exact."
        ),
    )
    p.add_argument(
        "--sample-interval-s",
        type=float,
        default=DEFAULT_SAMPLE_INTERVAL_S,
        help=f"RSS sample interval (default {DEFAULT_SAMPLE_INTERVAL_S}).",
    )
    p.add_argument(
        "--grace-s",
        type=float,
        default=DEFAULT_GRACE_S,
        help=f"Seconds between SIGTERM and SIGKILL (default {DEFAULT_GRACE_S}).",
    )
    p.add_argument("--language-id", default=None)
    p.add_argument("--exaggeration", type=float, default=None)
    p.add_argument("--cfg-weight", type=float, default=None)
    p.add_argument("--temperature", type=float, default=None)
    return p


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(list(argv) if argv is not None else None)

    if args.text_file:
        text = Path(args.text_file).read_text(encoding="utf-8")
    else:
        text = args.text or ""

    if not text.strip():
        print(
            json.dumps(
                {"ok": False, "error": "text is empty", "termination_reason": "empty_text"},
                indent=2,
            ),
            file=sys.stderr,
        )
        return EXIT_PRE_SPAWN

    if args.timeout_s <= 0 or args.rss_limit_gib <= 0:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "timeout-s and rss-limit-gib must be > 0",
                },
                indent=2,
            ),
            file=sys.stderr,
        )
        return EXIT_PRE_SPAWN

    result = supervise(
        python=args.python,
        script=args.script,
        text=text,
        ref=args.ref,
        ckpt_dir=args.ckpt_dir,
        output=args.output,
        device=args.device,
        meta_out=args.meta_out,
        run_log=args.run_log,
        timeout_s=args.timeout_s,
        rss_limit_gib=args.rss_limit_gib,
        sample_interval_s=args.sample_interval_s,
        grace_s=args.grace_s,
        language_id=args.language_id,
        exaggeration=args.exaggeration,
        cfg_weight=args.cfg_weight,
        temperature=args.temperature,
    )
    print(json.dumps(result.payload, indent=2))
    return result.supervisor_exit


if __name__ == "__main__":
    raise SystemExit(main())
