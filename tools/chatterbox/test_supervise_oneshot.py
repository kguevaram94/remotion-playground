#!/usr/bin/env python3
"""Tests for supervise_oneshot — fake children only; no torch, models, or audio."""
from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from typing import Any

import supervise_oneshot as sup


def _write_fake_child(path: Path, source: str) -> Path:
    path.write_text(source, encoding="utf-8")
    return path


def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


class BuildArgvTests(unittest.TestCase):
    def test_never_includes_force(self) -> None:
        argv = sup.build_child_argv(
            python="python3.11",
            script="synthesize.py",
            text="hola",
            ref="/ref.wav",
            ckpt_dir="/ckpt",
            output="/out.wav",
            device="mps",
            meta_out="/out.meta.json",
        )
        self.assertNotIn("--force", argv)
        self.assertEqual(argv.count("--device"), 1)
        self.assertIn("mps", argv)


class PreSpawnRejectTests(unittest.TestCase):
    def test_reject_existing_output(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            out = root / "out.wav"
            out.write_bytes(b"x")
            result = sup.supervise(
                python=sys.executable,
                script=str(root / "missing.py"),
                text="hi",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(out),
                device="mps",
                timeout_s=1.0,
                sample_interval_s=0.05,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_PRE_SPAWN)
            self.assertEqual(result.payload["termination_reason"], "output_exists")
            self.assertFalse(result.payload["force_passed"])

    def test_reject_existing_meta(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            meta = root / "out.meta.json"
            meta.write_text("{}", encoding="utf-8")
            out = root / "out.wav"
            result = sup.supervise(
                python=sys.executable,
                script=str(root / "missing.py"),
                text="hi",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(out),
                meta_out=str(meta),
                device="mps",
                timeout_s=1.0,
                sample_interval_s=0.05,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_PRE_SPAWN)
            self.assertEqual(result.payload["termination_reason"], "meta_exists")

    def test_reject_existing_run_log(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            log = root / "supervisor.json"
            log.write_text("{}", encoding="utf-8")
            result = sup.supervise(
                python=sys.executable,
                script=str(root / "missing.py"),
                text="hi",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                run_log=str(log),
                device="mps",
                timeout_s=1.0,
                sample_interval_s=0.05,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_PRE_SPAWN)
            self.assertEqual(result.payload["termination_reason"], "run_log_exists")
            # Must not overwrite the pre-existing log.
            self.assertEqual(log.read_text(encoding="utf-8"), "{}")

    def test_reject_run_log_directory(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            log_dir = root / "run_log_dir"
            log_dir.mkdir()
            result = sup.supervise(
                python=sys.executable,
                script=str(root / "missing.py"),
                text="hi",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                run_log=str(log_dir),
                device="mps",
                timeout_s=1.0,
                sample_interval_s=0.05,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_PRE_SPAWN)
            self.assertEqual(result.payload["termination_reason"], "run_log_is_directory")
            self.assertTrue(log_dir.is_dir())


class SuccessAndFailTests(unittest.TestCase):
    def test_success_fake_child(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = _write_fake_child(
                root / "fake_ok.py",
                "import sys\nsys.exit(0)\n",
            )
            log = root / "run.json"
            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text="secret-text-should-not-appear",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                run_log=str(log),
                device="mps",
                timeout_s=5.0,
                sample_interval_s=0.05,
                sample_rss_fn=lambda _pid: 1024,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_OK)
            self.assertTrue(result.payload["ok"])
            self.assertEqual(result.payload["termination_reason"], "child_exit")
            self.assertEqual(result.payload["exit_code"], 0)
            self.assertEqual(result.payload["text_chars"], len("secret-text-should-not-appear"))
            blob = json.dumps(result.payload)
            self.assertNotIn("secret-text-should-not-appear", blob)
            self.assertTrue(log.is_file())
            saved = json.loads(log.read_text(encoding="utf-8"))
            self.assertEqual(saved["termination_reason"], "child_exit")
            self.assertIn("rss_metric_note", saved)

    def test_child_nonzero_exit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = _write_fake_child(
                root / "fake_fail.py",
                "import sys\nsys.exit(1)\n",
            )
            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text="x",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                device="mps",
                timeout_s=5.0,
                sample_interval_s=0.05,
                sample_rss_fn=lambda _pid: 0,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_CHILD_FAIL)
            self.assertEqual(result.payload["termination_reason"], "child_exit")
            self.assertEqual(result.payload["exit_code"], 1)


class TimeoutTests(unittest.TestCase):
    def test_timeout_sigterm_then_kill_if_needed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            # Ignore SIGTERM so supervisor must escalate to SIGKILL.
            script = _write_fake_child(
                root / "fake_ignore_term.py",
                "\n".join(
                    [
                        "import signal, time, sys",
                        "signal.signal(signal.SIGTERM, signal.SIG_IGN)",
                        "time.sleep(30)",
                        "sys.exit(0)",
                        "",
                    ]
                ),
            )
            t0 = time.monotonic()
            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text="x",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                device="mps",
                timeout_s=0.25,
                sample_interval_s=0.05,
                grace_s=0.2,
                sample_rss_fn=lambda _pid: 0,
            )
            elapsed = time.monotonic() - t0
            self.assertEqual(result.supervisor_exit, sup.EXIT_TIMEOUT)
            self.assertEqual(result.payload["termination_reason"], "timeout")
            self.assertLess(elapsed, 5.0)
            # Child should be gone.
            self.assertIsNotNone(result.payload["duration_s"])


class RssLimitTests(unittest.TestCase):
    def test_simulated_rss_triggers_termination(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = _write_fake_child(
                root / "fake_sleep.py",
                "import time, sys\ntime.sleep(30)\nsys.exit(0)\n",
            )
            samples = {"n": 0}

            def fake_rss(_pid: int) -> int:
                samples["n"] += 1
                # Cross a tiny ceiling on the second sample.
                return 1000 if samples["n"] < 2 else 5 * 1024 * 1024

            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text="x",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                device="mps",
                timeout_s=30.0,
                sample_interval_s=0.05,
                grace_s=0.3,
                rss_limit_gib=1.0 / 1024,  # 1 MiB ceiling
                sample_rss_fn=fake_rss,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_RSS)
            self.assertEqual(result.payload["termination_reason"], "rss_limit")
            self.assertGreaterEqual(result.payload["peak_rss_bytes"], 5 * 1024 * 1024)
            self.assertIn("approx", result.payload["rss_metric_note"].lower())


class ProcessGroupTests(unittest.TestCase):
    def test_kill_terminates_forked_descendant(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            marker = root / "child_pids.txt"
            script = _write_fake_child(
                root / "fake_fork.py",
                "\n".join(
                    [
                        "import os, time, sys",
                        f"marker = {str(marker)!r}",
                        "pid = os.fork()",
                        "with open(marker, 'a', encoding='utf-8') as fh:",
                        "    fh.write(str(os.getpid()) + '\\n')",
                        "time.sleep(30)",
                        "sys.exit(0)",
                        "",
                    ]
                ),
            )
            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text="x",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                device="mps",
                timeout_s=0.3,
                sample_interval_s=0.05,
                grace_s=0.3,
                sample_rss_fn=lambda _pid: 0,
            )
            self.assertEqual(result.payload["termination_reason"], "timeout")
            # Give the OS a moment to reap.
            time.sleep(0.2)
            self.assertTrue(marker.is_file())
            pids = [
                int(line)
                for line in marker.read_text(encoding="utf-8").splitlines()
                if line.strip()
            ]
            self.assertGreaterEqual(len(pids), 2)
            for pid in pids:
                self.assertFalse(_pid_alive(pid), f"pid {pid} still alive after killpg")


class CaptureSaturationTests(unittest.TestCase):
    def test_stdout_stderr_over_cap_does_not_block_or_retain_unbounded(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            # Well above typical pipe buffer and capture cap: prove drain keeps
            # the child unblocked and retained windows stay capped.
            chunk = b"OUT_MARKER_TAIL_xyz\n"
            stderr_chunk = b"ERR_MARKER_TAIL_xyz\n"
            repeats = 20_000  # ~400KB+ per stream
            script = _write_fake_child(
                root / "fake_flood.py",
                "\n".join(
                    [
                        "import sys",
                        f"chunk = {chunk!r}",
                        f"err = {stderr_chunk!r}",
                        f"for _ in range({repeats}):",
                        "    sys.stdout.buffer.write(chunk)",
                        "    sys.stderr.buffer.write(err)",
                        "sys.stdout.buffer.flush()",
                        "sys.stderr.buffer.flush()",
                        "sys.exit(0)",
                        "",
                    ]
                ),
            )
            cap = 4096
            tail_chars = 64
            t0 = time.monotonic()
            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text="x",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                device="mps",
                timeout_s=30.0,
                sample_interval_s=0.05,
                capture_cap_bytes=cap,
                log_tail_chars=tail_chars,
                sample_rss_fn=lambda _pid: 0,
            )
            elapsed = time.monotonic() - t0
            self.assertEqual(result.supervisor_exit, sup.EXIT_OK)
            self.assertLess(elapsed, 15.0, "child appears blocked on a full pipe")
            expected_out = len(chunk) * repeats
            expected_err = len(stderr_chunk) * repeats
            self.assertEqual(result.payload["child_stdout_bytes"], expected_out)
            self.assertEqual(result.payload["child_stderr_bytes"], expected_err)
            self.assertLessEqual(len(result.payload["child_stdout_tail"]), tail_chars)
            self.assertLessEqual(len(result.payload["child_stderr_tail"]), tail_chars)
            # Rolling window must expose the true stream tail, not a prefix.
            self.assertTrue(
                result.payload["child_stdout_tail"].endswith("OUT_MARKER_TAIL_xyz\n")
                or "OUT_MARKER_TAIL_xyz" in result.payload["child_stdout_tail"]
            )
            self.assertTrue(
                result.payload["child_stderr_tail"].endswith("ERR_MARKER_TAIL_xyz\n")
                or "ERR_MARKER_TAIL_xyz" in result.payload["child_stderr_tail"]
            )


class SupervisorInterruptTests(unittest.TestCase):
    def _long_child(self, root: Path) -> Path:
        return _write_fake_child(
            root / "fake_long.py",
            "import time, sys\ntime.sleep(30)\nsys.exit(0)\n",
        )

    def _ignore_term_child(self, root: Path) -> Path:
        return _write_fake_child(
            root / "fake_ignore_term.py",
            "\n".join(
                [
                    "import signal, time, sys",
                    "signal.signal(signal.SIGTERM, signal.SIG_IGN)",
                    "time.sleep(30)",
                    "sys.exit(0)",
                    "",
                ]
            ),
        )

    def test_supervisor_sigterm_stops_child(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = self._long_child(root)

            def fire() -> None:
                time.sleep(0.35)
                os.kill(os.getpid(), signal.SIGTERM)

            threading.Thread(target=fire, daemon=True).start()
            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text="x",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                device="mps",
                timeout_s=30.0,
                sample_interval_s=0.05,
                grace_s=0.3,
                sample_rss_fn=lambda _pid: 0,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_SUPERVISOR_SIGNAL)
            self.assertEqual(result.payload["termination_reason"], "supervisor_signal")

    def test_supervisor_sigint_stops_child(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = self._long_child(root)
            log = root / "sigint.json"

            def fire() -> None:
                time.sleep(0.35)
                os.kill(os.getpid(), signal.SIGINT)

            threading.Thread(target=fire, daemon=True).start()
            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text="x",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                run_log=str(log),
                device="mps",
                timeout_s=30.0,
                sample_interval_s=0.05,
                grace_s=0.3,
                sample_rss_fn=lambda _pid: 0,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_SUPERVISOR_SIGNAL)
            self.assertEqual(result.payload["termination_reason"], "supervisor_signal")
            saved = json.loads(log.read_text(encoding="utf-8"))
            self.assertEqual(saved["termination_reason"], "supervisor_signal")

    def test_signal_during_startup_does_not_orphan_child(self) -> None:
        """Signal delivered inside popen_fn (before Popen returns) is handled."""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = self._long_child(root)
            spawned_pid: list[int] = []

            def popen_with_early_signal(
                *args: Any, **kwargs: Any
            ) -> subprocess.Popen[Any]:
                # Deliver SIGTERM while handlers are already installed and before
                # the real child exists — then spawn. Supervisor must reap it.
                os.kill(os.getpid(), signal.SIGTERM)
                child = subprocess.Popen(*args, **kwargs)
                spawned_pid.append(child.pid)
                return child

            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text="x",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                device="mps",
                timeout_s=30.0,
                sample_interval_s=0.05,
                grace_s=0.3,
                sample_rss_fn=lambda _pid: 0,
                popen_fn=popen_with_early_signal,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_SUPERVISOR_SIGNAL)
            self.assertEqual(result.payload["termination_reason"], "supervisor_signal")
            self.assertTrue(spawned_pid)
            time.sleep(0.15)
            self.assertFalse(_pid_alive(spawned_pid[0]), "child orphaned after startup signal")

    def test_repeated_signal_during_termination_is_safe(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = self._ignore_term_child(root)
            log = root / "reentry.json"

            def fire_burst() -> None:
                time.sleep(0.25)
                os.kill(os.getpid(), signal.SIGTERM)
                time.sleep(0.05)
                os.kill(os.getpid(), signal.SIGTERM)
                time.sleep(0.05)
                os.kill(os.getpid(), signal.SIGINT)

            threading.Thread(target=fire_burst, daemon=True).start()
            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text="x",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                run_log=str(log),
                device="mps",
                timeout_s=30.0,
                sample_interval_s=0.05,
                grace_s=0.6,
                sample_rss_fn=lambda _pid: 0,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_SUPERVISOR_SIGNAL)
            self.assertEqual(result.payload["termination_reason"], "supervisor_signal")
            saved = json.loads(log.read_text(encoding="utf-8"))
            self.assertEqual(saved["termination_reason"], "supervisor_signal")

    def test_signal_during_run_log_write_still_completes_and_restores(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = _write_fake_child(
                root / "fake_ok.py",
                "import sys\nsys.exit(0)\n",
            )
            log = root / "during_write.json"
            original_write = sup.write_run_log
            saw_signal = {"n": 0}

            def write_and_signal(path: Path, payload: dict[str, Any]) -> None:
                os.kill(os.getpid(), signal.SIGTERM)
                saw_signal["n"] += 1
                original_write(path, payload)

            prev_term = signal.getsignal(signal.SIGTERM)
            prev_int = signal.getsignal(signal.SIGINT)
            try:
                sup.write_run_log = write_and_signal  # type: ignore[assignment]
                result = sup.supervise(
                    python=sys.executable,
                    script=str(script),
                    text="x",
                    ref=str(root / "ref.wav"),
                    ckpt_dir=str(root),
                    output=str(root / "out.wav"),
                    run_log=str(log),
                    device="mps",
                    timeout_s=5.0,
                    sample_interval_s=0.05,
                    sample_rss_fn=lambda _pid: 0,
                )
            finally:
                sup.write_run_log = original_write  # type: ignore[assignment]

            self.assertEqual(saw_signal["n"], 1)
            self.assertEqual(result.supervisor_exit, sup.EXIT_OK)
            self.assertEqual(result.payload["termination_reason"], "child_exit")
            self.assertTrue(log.is_file())
            saved = json.loads(log.read_text(encoding="utf-8"))
            self.assertEqual(saved["termination_reason"], "child_exit")
            self.assertEqual(signal.getsignal(signal.SIGTERM), prev_term)
            self.assertEqual(signal.getsignal(signal.SIGINT), prev_int)

    def test_handlers_restored_after_supervisor_signal(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = self._long_child(root)
            prev_term = signal.getsignal(signal.SIGTERM)
            prev_int = signal.getsignal(signal.SIGINT)

            def fire() -> None:
                time.sleep(0.3)
                os.kill(os.getpid(), signal.SIGTERM)

            threading.Thread(target=fire, daemon=True).start()
            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text="x",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                device="mps",
                timeout_s=30.0,
                sample_interval_s=0.05,
                grace_s=0.3,
                sample_rss_fn=lambda _pid: 0,
            )
            self.assertEqual(result.payload["termination_reason"], "supervisor_signal")
            self.assertEqual(signal.getsignal(signal.SIGTERM), prev_term)
            self.assertEqual(signal.getsignal(signal.SIGINT), prev_int)

    def test_handlers_restored_after_success(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = _write_fake_child(
                root / "fake_ok.py",
                "import sys\nsys.exit(0)\n",
            )
            prev_term = signal.getsignal(signal.SIGTERM)
            prev_int = signal.getsignal(signal.SIGINT)
            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text="x",
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                device="mps",
                timeout_s=5.0,
                sample_interval_s=0.05,
                sample_rss_fn=lambda _pid: 0,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_OK)
            self.assertEqual(signal.getsignal(signal.SIGTERM), prev_term)
            self.assertEqual(signal.getsignal(signal.SIGINT), prev_int)


class NoFullTextInLogTests(unittest.TestCase):
    def test_run_log_omits_full_text(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = _write_fake_child(
                root / "fake_ok.py",
                "import sys\nsys.exit(0)\n",
            )
            secret = "UNIQUE_SECRET_PHRASE_xyz_12345"
            log = root / "log.json"
            result = sup.supervise(
                python=sys.executable,
                script=str(script),
                text=secret,
                ref=str(root / "ref.wav"),
                ckpt_dir=str(root),
                output=str(root / "out.wav"),
                run_log=str(log),
                device="mps",
                timeout_s=5.0,
                sample_interval_s=0.05,
                sample_rss_fn=lambda _pid: 0,
            )
            self.assertEqual(result.supervisor_exit, sup.EXIT_OK)
            raw = log.read_text(encoding="utf-8")
            self.assertNotIn(secret, raw)
            self.assertIn('"text_chars"', raw)


class DefaultsTests(unittest.TestCase):
    def test_documented_defaults(self) -> None:
        self.assertEqual(sup.DEFAULT_TIMEOUT_S, 300.0)
        self.assertEqual(sup.DEFAULT_RSS_LIMIT_GIB, 16.0)
        self.assertEqual(sup.DEFAULT_GRACE_S, 2.0)
        self.assertEqual(sup.rss_limit_bytes(16.0), 16 * 1024**3)


class DrainPipeUnitTests(unittest.TestCase):
    def test_drain_keeps_stream_tail_and_total(self) -> None:
        import io

        data = b"abcdefghijklmnopqrstuvwxyz"
        sink = bytearray()
        total = [0]
        sup._drain_pipe(io.BytesIO(data), sink, cap=5, total_bytes=total)
        self.assertEqual(total[0], len(data))
        self.assertEqual(bytes(sink), b"vwxyz")


if __name__ == "__main__":
    unittest.main()
