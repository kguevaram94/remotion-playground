#!/usr/bin/env python3
"""Chatterbox TTS one-shot CLI (PCM16 mono 24 kHz).

Piloto-verified stack (see README.md):
  Python 3.11.17 · torch/torchaudio 2.6.0 · chatterbox-tts 0.1.7

This module keeps pure WAV/clamp helpers importable without torch so unit
tests never download models or run inference. Heavy imports are lazy.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import struct
import sys
import time
import wave
from array import array
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, Sequence

# Contract aligned with remotion-playground concat/loudnorm path (OpenAI WAV).
TARGET_SAMPLE_RATE = 24000
TARGET_CHANNELS = 1
TARGET_SAMPLE_WIDTH = 2  # PCM16
MODEL_ID_ES_ES = "ResembleAI/Chatterbox-Multilingual-es-es"
RUNTIME_PIN = {
    "python": "3.11.17",
    "torch": "2.6.0",
    "torchaudio": "2.6.0",
    "chatterbox_tts": "0.1.7",
}

# Documented CLI numeric ranges (finite; reject NaN/Inf).
EXAGGERATION_RANGE = (0.0, 1.0)
CFG_WEIGHT_RANGE = (0.0, 1.0)
TEMPERATURE_RANGE = (0.0, 2.0)  # exclusive low bound checked separately (> 0)


# ---------------------------------------------------------------------------
# Pure helpers (no torch) — unit-tested
# ---------------------------------------------------------------------------


def safe_resolve(path: Path | str) -> Path:
    """Resolve path (follow symlinks when possible). Never raises for missing."""
    p = Path(path)
    try:
        return p.resolve()
    except OSError:
        return p.absolute()


def paths_equal(a: Path | str, b: Path | str) -> bool:
    return safe_resolve(a) == safe_resolve(b)


@contextmanager
def temporary_attr_patch(obj: Any, attr: str, replacement: Any) -> Iterator[Any]:
    """Swap ``obj.attr`` for ``replacement`` and always restore (even on error).

    Synthetic tests use this without importing PyTorch. The MPS ``torch.load``
    patch is built on the same primitive.
    """
    if not hasattr(obj, attr):
        raise AttributeError(f"{type(obj)!r} has no attribute {attr!r}")
    original = getattr(obj, attr)
    setattr(obj, attr, replacement)
    try:
        yield original
    finally:
        setattr(obj, attr, original)


def iter_float_samples(waveform: Any) -> list[float]:
    """Flatten a torch/numpy/list waveform to a 1-D list of floats (mono).

    Dimension policy (documented):
    - 1-D sequence → used as-is (mono samples).
    - Nested list/tuple → **first channel only** (``waveform[0]``).
    - Tensor/ndarray with ndim > 1 → **first row** ``data[0]`` (assumes
      layout ``[channel, time]``). If the leading dim is larger than the
      trailing dim, fall back to ``reshape(-1)`` (treat as already flat-ish).
    This does **not** mix/average channels.
    """
    if waveform is None:
        raise ValueError("waveform is None")

    # torch.Tensor
    if hasattr(waveform, "detach") and hasattr(waveform, "cpu"):
        t = waveform.detach().cpu()
        if hasattr(t, "ndim") and int(t.ndim) > 1:
            # Assume [C, T] when leading dim looks like channel count.
            if int(t.shape[0]) <= int(t.shape[-1]):
                t = t[0]
            else:
                t = t.reshape(-1)
        return [float(x) for x in t.reshape(-1).tolist()]

    # numpy-like
    if hasattr(waveform, "shape") and hasattr(waveform, "tolist"):
        data = waveform
        if getattr(data, "ndim", 1) > 1:
            data = data[0]
        flat = data.reshape(-1).tolist()
        return [float(x) for x in flat]

    if isinstance(waveform, (list, tuple)):
        if waveform and isinstance(waveform[0], (list, tuple)):
            return [float(x) for x in waveform[0]]
        return [float(x) for x in waveform]

    raise TypeError(f"unsupported waveform type: {type(waveform)!r}")


def assert_finite_samples(samples: Sequence[float]) -> None:
    """Reject NaN / ±Inf before peak stats or PCM conversion (fail-fast)."""
    for i, raw in enumerate(samples):
        v = float(raw)
        if math.isnan(v):
            raise ValueError(
                f"non-finite sample at index {i}: NaN "
                "(refusing PCM conversion; peak metadata would be misleading)"
            )
        if math.isinf(v):
            sign = "+" if v > 0 else "-"
            raise ValueError(
                f"non-finite sample at index {i}: {sign}Inf "
                "(refusing PCM conversion; peak metadata would be misleading)"
            )


def clamp_float_to_pcm16(
    samples: Sequence[float],
) -> tuple[bytes, dict[str, Any]]:
    """Hard-clamp finite Float32 samples to [-1, 1] and encode LE PCM16.

    Rejects empty input and any NaN/±Inf (see ``assert_finite_samples``).
    Returns PCM bytes plus metadata:
      peak_abs_before, samples_clamped, sample_count, clip_ratio
    """
    if not samples:
        raise ValueError("empty waveform: need at least one sample")

    assert_finite_samples(samples)

    peak = 0.0
    clamped = 0
    pcm = array("h")
    scale = 32767.0

    for raw in samples:
        v = float(raw)
        av = abs(v)
        if av > peak:
            peak = av
        if v > 1.0:
            v = 1.0
            clamped += 1
        elif v < -1.0:
            v = -1.0
            clamped += 1
        pcm.append(int(round(v * scale)))

    meta = {
        "peak_abs_before": peak,
        "samples_clamped": clamped,
        "sample_count": len(samples),
        "clip_ratio": (clamped / len(samples)) if samples else 0.0,
        "encoding": "pcm_s16le",
        "clamp": "hard_[-1,1]",
    }
    return pcm.tobytes(), meta


def _assert_riff_wave(path: Path) -> None:
    with path.open("rb") as fh:
        header = fh.read(12)
    if len(header) < 12 or header[0:4] != b"RIFF" or header[8:12] != b"WAVE":
        raise ValueError(f"not a RIFF/WAVE file: {path}")


def write_pcm16_wav(
    path: Path | str,
    pcm: bytes,
    *,
    sample_rate: int = TARGET_SAMPLE_RATE,
    channels: int = TARGET_CHANNELS,
    force: bool = False,
) -> dict[str, Any]:
    """Write mono PCM16 WAV via same-dir tempfile + atomic ``os.replace``.

    Rejects empty PCM, wrong rate/channels, existing destination unless
    ``force``, and cleans up the tempfile on failure (never deletes a
    pre-existing final path on failure).
    """
    if sample_rate != TARGET_SAMPLE_RATE:
        raise ValueError(
            f"sample_rate must be {TARGET_SAMPLE_RATE}, got {sample_rate}"
        )
    if channels != TARGET_CHANNELS:
        raise ValueError(f"channels must be {TARGET_CHANNELS}, got {channels}")
    frame_bytes = TARGET_SAMPLE_WIDTH * channels
    if len(pcm) < frame_bytes:
        raise ValueError("empty PCM: need at least one sample")
    if len(pcm) % frame_bytes != 0:
        raise ValueError("PCM byte length is not aligned to frame size")

    out = Path(path)
    if out.exists() and not force:
        raise FileExistsError(
            f"output already exists (pass --force to overwrite): {out}"
        )
    if out.exists() and out.is_dir():
        raise IsADirectoryError(f"output path is a directory: {out}")

    out.parent.mkdir(parents=True, exist_ok=True)
    nframes = len(pcm) // frame_bytes
    tmp = out.with_name(f".{out.name}.{os.getpid()}.{time.time_ns()}.tmp")
    try:
        with wave.open(str(tmp), "wb") as wf:
            wf.setnchannels(channels)
            wf.setsampwidth(TARGET_SAMPLE_WIDTH)
            wf.setframerate(sample_rate)
            wf.writeframes(pcm)
        validated = validate_pcm16_mono_24k(tmp)
        os.replace(str(tmp), str(out))
    except Exception:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass
        raise

    return {
        "path": str(out),
        "sample_rate": sample_rate,
        "channels": channels,
        "sample_width": TARGET_SAMPLE_WIDTH,
        "nframes": nframes,
        "duration_seconds": nframes / float(sample_rate),
        "file_bytes": out.stat().st_size,
        "validated_before_replace": validated["ok"],
    }


def write_json_atomic(
    path: Path | str,
    payload: dict[str, Any],
    *,
    force: bool = False,
) -> Path:
    """Write JSON via tempfile + ``os.replace``; respect existence unless force."""
    out = Path(path)
    if out.exists() and not force:
        raise FileExistsError(
            f"meta-out already exists (pass --force to overwrite): {out}"
        )
    if out.exists() and out.is_dir():
        raise IsADirectoryError(f"meta-out path is a directory: {out}")
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_name(f".{out.name}.{os.getpid()}.{time.time_ns()}.tmp")
    try:
        tmp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        os.replace(str(tmp), str(out))
    except Exception:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass
        raise
    return out


def read_wav_info(path: Path | str) -> dict[str, Any]:
    """Inspect a WAV header + basic PCM stats (stdlib only)."""
    p = Path(path)
    _assert_riff_wave(p)
    with wave.open(str(p), "rb") as wf:
        channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        sample_rate = wf.getframerate()
        nframes = wf.getnframes()
        frames = wf.readframes(nframes)

    info: dict[str, Any] = {
        "path": str(p),
        "sample_rate": sample_rate,
        "channels": channels,
        "sample_width": sample_width,
        "nframes": nframes,
        "duration_seconds": nframes / float(sample_rate) if sample_rate else 0.0,
        "file_bytes": p.stat().st_size,
        "comptype": "NONE",
        "riff_wave": True,
    }

    if sample_width == 2:
        samples = array("h")
        samples.frombytes(frames)
        if samples:
            peak = max(abs(s) for s in samples)
            info["peak_abs_pcm16"] = peak
            info["peak_abs_normalized"] = peak / 32767.0
    elif sample_width == 4:
        # Width-4 payload may be int32 PCM or float32; wave stdlib often tags PCM.
        count = len(frames) // 4
        floats = struct.unpack("<" + "f" * count, frames)
        peak = max(abs(x) for x in floats) if floats else 0.0
        over = sum(1 for x in floats if abs(x) > 1.0)
        info["format_hint"] = "width4_interpreted_as_float32_bytes"
        info["peak_abs_before"] = peak
        info["samples_out_of_range"] = over

    return info


def validate_pcm16_mono_24k(path: Path | str) -> dict[str, Any]:
    """Raise ValueError unless WAV is PCM16 mono 24 kHz with ≥1 frame."""
    info = read_wav_info(path)
    errors: list[str] = []
    if info["sample_rate"] != TARGET_SAMPLE_RATE:
        errors.append(f"sample_rate={info['sample_rate']} (want {TARGET_SAMPLE_RATE})")
    if info["channels"] != TARGET_CHANNELS:
        errors.append(f"channels={info['channels']} (want {TARGET_CHANNELS})")
    if info["sample_width"] != TARGET_SAMPLE_WIDTH:
        errors.append(
            f"sample_width={info['sample_width']} (want {TARGET_SAMPLE_WIDTH} = PCM16)"
        )
    if int(info["nframes"]) < 1:
        errors.append("nframes=0 (need positive duration, ≥1 sample)")
    if float(info["duration_seconds"]) <= 0.0:
        errors.append(
            f"duration_seconds={info['duration_seconds']} (must be > 0)"
        )
    if errors:
        raise ValueError("WAV contract failed: " + "; ".join(errors))
    info["ok"] = True
    info["contract"] = "pcm16_mono_24k"
    return info


def float_waveform_to_pcm16_wav(
    waveform: Any,
    output_path: Path | str,
    *,
    sample_rate: int = TARGET_SAMPLE_RATE,
    force: bool = False,
) -> dict[str, Any]:
    """Convert model float waveform → clamped PCM16 WAV + metadata."""
    if sample_rate != TARGET_SAMPLE_RATE:
        raise ValueError(
            f"refusing non-{TARGET_SAMPLE_RATE} Hz output (got {sample_rate})"
        )
    samples = iter_float_samples(waveform)
    pcm, clamp_meta = clamp_float_to_pcm16(samples)
    wav_meta = write_pcm16_wav(
        output_path,
        pcm,
        sample_rate=sample_rate,
        channels=TARGET_CHANNELS,
        force=force,
    )
    validated = validate_pcm16_mono_24k(output_path)
    return {
        **clamp_meta,
        **wav_meta,
        "validated": validated["ok"],
        "perth_watermark": "left_intact",
    }


def validate_numeric_param(name: str, value: float, *, lo: float, hi: float, exclusive_lo: bool = False) -> float:
    """Reject NaN/Inf and out-of-range floats."""
    v = float(value)
    if math.isnan(v) or math.isinf(v):
        raise ValueError(f"{name} must be a finite float, got {value!r}")
    if exclusive_lo:
        if not (lo < v <= hi):
            raise ValueError(f"{name} must satisfy {lo} < x <= {hi}, got {v}")
    else:
        if not (lo <= v <= hi):
            raise ValueError(f"{name} must satisfy {lo} <= x <= {hi}, got {v}")
    return v


def preflight_io_paths(
    *,
    ref_wav: Path | str,
    output: Path | str,
    meta_out: Path | str | None,
    ckpt_dir: Path | str,
    force: bool,
) -> dict[str, Path]:
    """Validate paths before expensive model load. Never lets --force hit --ref."""
    ref = Path(ref_wav)
    out = Path(output)
    ckpt = Path(ckpt_dir)

    if not ref.is_file():
        raise FileNotFoundError(f"ref WAV not found: {ref}")
    if out.exists() and out.is_dir():
        raise IsADirectoryError(f"output path is a directory: {out}")
    if not ckpt.is_dir():
        raise NotADirectoryError(f"ckpt-dir is not a directory: {ckpt}")

    ref_r = safe_resolve(ref)
    out_r = safe_resolve(out)

    if paths_equal(out_r, ref_r):
        raise ValueError(
            "refusing to write --output to the same path as --ref "
            "(vocal reference protection; --force cannot override this)"
        )

    if out.exists() and not force:
        raise FileExistsError(
            f"output already exists (pass --force to overwrite): {out}"
        )

    # Parent must be creatable / writable.
    parent = out.parent
    if parent.exists():
        if not parent.is_dir():
            raise NotADirectoryError(f"output parent is not a directory: {parent}")
        if not os.access(parent, os.W_OK):
            raise PermissionError(f"output parent is not writable: {parent}")
    else:
        # Ensure we can create the chain: nearest existing ancestor must be writable.
        ancestor = parent
        while not ancestor.exists() and ancestor != ancestor.parent:
            ancestor = ancestor.parent
        if not ancestor.exists() or not os.access(ancestor, os.W_OK):
            raise PermissionError(
                f"cannot create output parent directory (ancestor not writable): {parent}"
            )

    meta_path: Path | None = None
    if meta_out is not None:
        meta_path = Path(meta_out)
        if meta_path.exists() and meta_path.is_dir():
            raise IsADirectoryError(f"meta-out path is a directory: {meta_path}")
        meta_r = safe_resolve(meta_path)
        if paths_equal(meta_r, ref_r):
            raise ValueError(
                "refusing to write --meta-out to the same path as --ref "
                "(vocal reference protection; --force cannot override this)"
            )
        if paths_equal(meta_r, out_r):
            raise ValueError(
                "refusing overlapping --output and --meta-out paths"
            )
        if meta_path.exists() and not force:
            raise FileExistsError(
                f"meta-out already exists (pass --force to overwrite): {meta_path}"
            )
        meta_parent = meta_path.parent
        if meta_parent.exists():
            if not meta_parent.is_dir():
                raise NotADirectoryError(
                    f"meta-out parent is not a directory: {meta_parent}"
                )
            if not os.access(meta_parent, os.W_OK):
                raise PermissionError(
                    f"meta-out parent is not writable: {meta_parent}"
                )

    return {"ref": ref, "output": out, "ckpt": ckpt, "meta": meta_path}


# ---------------------------------------------------------------------------
# Device / MPS patch / es-es loader (lazy torch)
# ---------------------------------------------------------------------------


@contextmanager
def patched_torch_load_for_mac() -> Iterator[None]:
    """Scoped MPS patch: default map_location=cpu when omitted; always restore.

    Only intended while loading CUDA-saved ``.pt`` checkpoints onto Apple
    Silicon. Callers must enter this context only when device is ``mps``.
    """
    import torch

    map_location = torch.device("cpu")
    original = torch.load

    def patched(*args: Any, **kwargs: Any) -> Any:
        if "map_location" not in kwargs:
            kwargs["map_location"] = map_location
        return original(*args, **kwargs)

    with temporary_attr_patch(torch, "load", patched):
        yield


def pick_device(requested: str) -> str:
    """Resolve auto|mps|cpu|cuda. Forced ``mps`` fails if unavailable (no silent CPU)."""
    import torch

    req = (requested or "auto").lower()
    mps_ok = torch.backends.mps.is_available() and torch.backends.mps.is_built()

    if req == "cpu":
        return "cpu"
    if req == "mps":
        if not mps_ok:
            raise RuntimeError(
                "device=mps was requested but MPS is not available/built "
                "(refusing silent fallback to CPU)"
            )
        return "mps"
    if req == "auto":
        return "mps" if mps_ok else "cpu"
    if req == "cuda":
        if torch.cuda.is_available():
            return "cuda"
        raise RuntimeError(
            "device=cuda was requested but CUDA is not available "
            "(refusing silent fallback to CPU)"
        )
    raise ValueError(f"unsupported device: {requested!r}")


def load_es_es(ckpt_dir: Path | str, device: str) -> tuple[Any, dict[str, Any]]:
    """Custom loader for ResembleAI/Chatterbox-Multilingual-es-es.

    Ported from the local piloto. Key differences vs stock from_local:
      - t3 weights: t3_es_es.safetensors
      - s3gen weights: s3gen_v3.pt with load_state_dict(..., strict=False)
        (expected missing: tokenizer._mel_filters, tokenizer.window)
      - map_location=cpu for cpu/mps before .to(device)
    """
    import torch
    from safetensors.torch import load_file as load_safetensors

    from chatterbox.models.s3gen import S3Gen
    from chatterbox.models.t3 import T3
    from chatterbox.models.t3.modules.t3_config import T3Config
    from chatterbox.models.tokenizers import MTLTokenizer
    from chatterbox.models.voice_encoder import VoiceEncoder
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS, Conditionals

    ckpt = Path(ckpt_dir)
    required = [
        "ve.pt",
        "t3_es_es.safetensors",
        "s3gen_v3.pt",
        "grapheme_mtl_merged_expanded_v1.json",
    ]
    missing_files = [n for n in required if not (ckpt / n).is_file()]
    if missing_files:
        raise FileNotFoundError(
            f"es-es checkpoint incomplete under {ckpt}: missing {missing_files}"
        )

    map_location = torch.device("cpu") if device in ("cpu", "mps") else None

    ve = VoiceEncoder()
    ve.load_state_dict(
        torch.load(ckpt / "ve.pt", map_location=map_location, weights_only=True)
    )
    ve.to(device).eval()

    t3 = T3(T3Config.multilingual())
    t3_state = load_safetensors(str(ckpt / "t3_es_es.safetensors"))
    if "model" in t3_state.keys():
        t3_state = t3_state["model"][0]
    t3.load_state_dict(t3_state)
    t3.to(device).eval()

    s3gen = S3Gen()
    s3_state = torch.load(
        ckpt / "s3gen_v3.pt", map_location=map_location, weights_only=True
    )
    missing, unexpected = s3gen.load_state_dict(s3_state, strict=False)
    s3gen.to(device).eval()

    tokenizer = MTLTokenizer(str(ckpt / "grapheme_mtl_merged_expanded_v1.json"))

    conds = None
    conds_loaded = False
    conds_note = (
        "conds.pt not present; Conditionals.load not exercised in this run"
    )
    if (ckpt / "conds.pt").exists():
        # Pilot did not verify Conditionals.load + weights_only in this CLI env.
        conds = Conditionals.load(ckpt / "conds.pt", map_location=map_location).to(
            device
        )
        conds_loaded = True
        conds_note = (
            "conds.pt loaded via Conditionals.load (compatibility with "
            "weights_only / this env: pending authorized manual smoke)"
        )

    model = ChatterboxMultilingualTTS(t3, s3gen, ve, tokenizer, device, conds=conds)
    meta = {
        "model_id": MODEL_ID_ES_ES,
        "ckpt_dir": str(ckpt),
        "device": device,
        "s3gen_strict": False,
        "s3gen_missing_keys": list(missing),
        "s3gen_unexpected_keys": list(unexpected),
        "s3gen_strict_false_rationale": (
            "s3gen_v3.pt vs chatterbox-tts 0.1.7 module: missing tokenizer "
            "buffers (_mel_filters, window) are expected; do not use strict=True"
        ),
        "weights_only": {
            "ve.pt": "True (pilot-verified on pinned stack)",
            "s3gen_v3.pt": "True (pilot-verified on pinned stack)",
            "t3_es_es.safetensors": "n/a (safetensors loader)",
            "conds.pt": conds_note,
        },
        "conds_loaded": conds_loaded,
        "mps_patch": (
            "scoped torch.load map_location=cpu when omitted; only while device=mps"
        ),
        "perth_watermark": "left_intact",
    }
    return model, meta


def synthesize(
    *,
    text: str,
    output: Path | str,
    ref_wav: Path | str,
    ckpt_dir: Path | str,
    device: str = "auto",
    language_id: str = "es",
    exaggeration: float = 0.5,
    cfg_weight: float = 0.5,
    temperature: float = 0.8,
    meta_out: Path | str | None = None,
    force: bool = False,
) -> dict[str, Any]:
    """Load es-es, generate, clamp→PCM16, write WAV + optional JSON meta."""
    if not text.strip():
        raise ValueError("text is empty")

    exaggeration = validate_numeric_param(
        "exaggeration",
        exaggeration,
        lo=EXAGGERATION_RANGE[0],
        hi=EXAGGERATION_RANGE[1],
    )
    cfg_weight = validate_numeric_param(
        "cfg_weight",
        cfg_weight,
        lo=CFG_WEIGHT_RANGE[0],
        hi=CFG_WEIGHT_RANGE[1],
    )
    temperature = validate_numeric_param(
        "temperature",
        temperature,
        lo=TEMPERATURE_RANGE[0],
        hi=TEMPERATURE_RANGE[1],
        exclusive_lo=True,
    )

    paths = preflight_io_paths(
        ref_wav=ref_wav,
        output=output,
        meta_out=meta_out,
        ckpt_dir=ckpt_dir,
        force=force,
    )
    ref = paths["ref"]
    out = paths["output"]
    meta_path = paths.get("meta")

    # pick_device needs torch; do it after path preflight.
    resolved = pick_device(device)

    result: dict[str, Any] = {
        "ok": False,
        "model_id": MODEL_ID_ES_ES,
        "runtime_pin": RUNTIME_PIN,
        "device_requested": device,
        "device_used": resolved,
        "language_id": language_id,
        "exaggeration": exaggeration,
        "cfg_weight": cfg_weight,
        "temperature": temperature,
        "ref_wav": str(ref),
        "force": force,
        "perth_watermark": "left_intact",
        "text_chars": len(text),
    }

    def _run_load_and_generate() -> None:
        nonlocal result
        t0 = time.perf_counter()
        model, load_meta = load_es_es(ckpt_dir, resolved)
        result["load_seconds"] = round(time.perf_counter() - t0, 3)
        result["load_meta"] = load_meta

        t1 = time.perf_counter()
        wav = model.generate(
            text,
            language_id=language_id,
            audio_prompt_path=str(ref),
            exaggeration=exaggeration,
            cfg_weight=cfg_weight,
            temperature=temperature,
        )
        result["generate_seconds"] = round(time.perf_counter() - t1, 3)

        model_sr = int(getattr(model, "sr", TARGET_SAMPLE_RATE))
        audio_meta = float_waveform_to_pcm16_wav(
            wav,
            out,
            sample_rate=model_sr if model_sr else TARGET_SAMPLE_RATE,
            force=force,
        )
        result.update(
            {
                "ok": True,
                "output_wav": str(out),
                "audio": audio_meta,
            }
        )

        if meta_path is not None:
            written = write_json_atomic(meta_path, result, force=force)
            result["meta_out"] = str(written)

    if resolved == "mps":
        with patched_torch_load_for_mac():
            _run_load_and_generate()
    else:
        _run_load_and_generate()

    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="synthesize.py",
        description=(
            "Chatterbox es-es one-shot → PCM16 mono 24 kHz WAV "
            "(clamp Float32; Perth watermark left intact)."
        ),
    )
    # Core args are validated in main() so --print-pins can run alone.
    p.add_argument("--text", default=None, help="Text to synthesize (es-ES).")
    p.add_argument(
        "--output",
        "-o",
        default=None,
        help="Output WAV path (PCM16 mono 24 kHz). Refused if exists unless --force.",
    )
    p.add_argument(
        "--ref",
        default=None,
        help="Reference voice WAV path (local; not committed to Git).",
    )
    p.add_argument(
        "--ckpt-dir",
        default=None,
        help="Local directory with es-es weights (ve.pt, t3_es_es.safetensors, …).",
    )
    p.add_argument(
        "--device",
        default="auto",
        choices=("auto", "mps", "cpu", "cuda"),
        help=(
            "Device (default: auto → mps if available else cpu). "
            "Forced mps/cuda fail if unavailable (no silent CPU fallback)."
        ),
    )
    p.add_argument("--language-id", default="es", help="language_id for generate().")
    p.add_argument(
        "--exaggeration",
        type=float,
        default=0.5,
        help=f"Finite float in [{EXAGGERATION_RANGE[0]}, {EXAGGERATION_RANGE[1]}].",
    )
    p.add_argument(
        "--cfg-weight",
        type=float,
        default=0.5,
        help=f"Finite float in [{CFG_WEIGHT_RANGE[0]}, {CFG_WEIGHT_RANGE[1]}].",
    )
    p.add_argument(
        "--temperature",
        type=float,
        default=0.8,
        help=f"Finite float with {TEMPERATURE_RANGE[0]} < x <= {TEMPERATURE_RANGE[1]}.",
    )
    p.add_argument(
        "--meta-out",
        default=None,
        help="Optional JSON sidecar. Refused if exists unless --force.",
    )
    p.add_argument(
        "--force",
        action="store_true",
        help=(
            "Overwrite existing --output / --meta-out. "
            "Never allows writing over --ref."
        ),
    )
    p.add_argument(
        "--print-pins",
        action="store_true",
        help="Print runtime pins as JSON and exit (no inference).",
    )
    return p


def main(argv: Sequence[str] | None = None) -> int:
    # argparse usage/errors stay on stderr in argparse's default format (not JSON).
    args = build_parser().parse_args(list(argv) if argv is not None else None)

    if args.print_pins:
        print(json.dumps({"runtime_pin": RUNTIME_PIN, "model_id": MODEL_ID_ES_ES}, indent=2))
        return 0

    missing = [
        name
        for name, value in (
            ("--text", args.text),
            ("--output", args.output),
            ("--ref", args.ref),
            ("--ckpt-dir", args.ckpt_dir),
        )
        if not value
    ]
    if missing:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": f"missing required arguments: {', '.join(missing)}",
                    "runtime_pin": RUNTIME_PIN,
                },
                indent=2,
            ),
            file=sys.stderr,
        )
        return 2

    try:
        result = synthesize(
            text=args.text,
            output=args.output,
            ref_wav=args.ref,
            ckpt_dir=args.ckpt_dir,
            device=args.device,
            language_id=args.language_id,
            exaggeration=args.exaggeration,
            cfg_weight=args.cfg_weight,
            temperature=args.temperature,
            meta_out=args.meta_out,
            force=bool(args.force),
        )
    except Exception as exc:
        # Keep stderr JSON readable; avoid dumping internal tracebacks to stdout.
        err = {
            "ok": False,
            "error": f"{type(exc).__name__}: {exc}",
            "runtime_pin": RUNTIME_PIN,
            "model_id": MODEL_ID_ES_ES,
        }
        print(json.dumps(err, indent=2), file=sys.stderr)
        return 1

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
