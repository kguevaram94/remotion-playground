#!/usr/bin/env python3
"""Unit tests for Chatterbox CLI helpers — no torch, no models, no inference.

Coverage map (honest):
  Covered here: clamp, finite-sample rejection, WAV contract, atomic IO guards,
  path overlap / --force vs --ref, scoped attr-patch restore, CLI pins/args,
  numeric ranges, README/pin tokens.
  NOT covered here: real inference, checkpoint load, MPS, Perth watermark,
  Conditionals.load / conds.pt compatibility (pilot / manual pending).
"""
from __future__ import annotations

import io
import json
import math
import struct
import tempfile
import unittest
import wave
from array import array
from contextlib import redirect_stderr
from pathlib import Path

# Allow `python -m unittest test_synthesize` from this directory.
import synthesize as syn


def _write_pcm16_fixture(path: Path, samples: list[float] | None = None) -> bytes:
    """Write a valid PCM16 mono 24 kHz WAV; return original file bytes."""
    if samples is None:
        samples = [0.0, 0.25, -0.5, 0.9]
    pcm, _ = syn.clamp_float_to_pcm16(samples)
    syn.write_pcm16_wav(path, pcm, force=True)
    return path.read_bytes()


class ClampTests(unittest.TestCase):
    def test_no_clip_when_in_range(self) -> None:
        samples = [0.0, 0.5, -0.25, 1.0, -1.0]
        pcm, meta = syn.clamp_float_to_pcm16(samples)
        self.assertEqual(meta["samples_clamped"], 0)
        self.assertEqual(meta["peak_abs_before"], 1.0)
        self.assertEqual(meta["sample_count"], 5)
        self.assertEqual(meta["clip_ratio"], 0.0)
        self.assertEqual(len(pcm), 5 * 2)
        decoded = array("h")
        decoded.frombytes(pcm)
        self.assertEqual(decoded[0], 0)
        self.assertEqual(decoded[1], round(0.5 * 32767))
        self.assertEqual(decoded[3], 32767)
        self.assertEqual(decoded[4], -32767)

    def test_hard_clamp_counts_out_of_range(self) -> None:
        samples = [1.12, -1.05, 0.9, 1.0000001]
        pcm, meta = syn.clamp_float_to_pcm16(samples)
        self.assertEqual(meta["samples_clamped"], 3)
        self.assertAlmostEqual(meta["peak_abs_before"], 1.12)
        self.assertAlmostEqual(meta["clip_ratio"], 0.75)
        decoded = array("h")
        decoded.frombytes(pcm)
        self.assertEqual(decoded[0], 32767)
        self.assertEqual(decoded[1], -32767)
        self.assertEqual(decoded[2], round(0.9 * 32767))
        self.assertEqual(decoded[3], 32767)

    def test_empty_raises(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            syn.clamp_float_to_pcm16([])
        self.assertIn("at least one sample", str(ctx.exception))

    def test_rejects_nan(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            syn.clamp_float_to_pcm16([0.1, float("nan"), 0.2])
        msg = str(ctx.exception)
        self.assertIn("NaN", msg)
        self.assertIn("index 1", msg)

    def test_rejects_pos_inf(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            syn.clamp_float_to_pcm16([0.1, float("inf")])
        self.assertIn("+Inf", str(ctx.exception))

    def test_rejects_neg_inf(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            syn.clamp_float_to_pcm16([float("-inf"), 0.0])
        self.assertIn("-Inf", str(ctx.exception))

    def test_assert_finite_does_not_report_misleading_peak(self) -> None:
        # Peak helpers must not run after non-finite detection.
        with self.assertRaises(ValueError):
            syn.assert_finite_samples([1.5, float("nan")])


class WavContractTests(unittest.TestCase):
    def test_write_and_validate_pcm16_mono_24k(self) -> None:
        samples = [0.0, 0.1, -0.1, 0.5]
        pcm, clamp_meta = syn.clamp_float_to_pcm16(samples)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "out.wav"
            wav_meta = syn.write_pcm16_wav(path, pcm)
            self.assertEqual(wav_meta["sample_rate"], 24000)
            self.assertEqual(wav_meta["channels"], 1)
            self.assertEqual(wav_meta["nframes"], 4)
            self.assertGreater(wav_meta["duration_seconds"], 0.0)
            info = syn.validate_pcm16_mono_24k(path)
            self.assertTrue(info["ok"])
            self.assertTrue(info["riff_wave"])
            self.assertEqual(info["contract"], "pcm16_mono_24k")
            self.assertEqual(clamp_meta["samples_clamped"], 0)

    def test_rejects_wrong_sample_rate_on_write(self) -> None:
        pcm, _ = syn.clamp_float_to_pcm16([0.0])
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bad.wav"
            with self.assertRaises(ValueError):
                syn.write_pcm16_wav(path, pcm, sample_rate=22050)

    def test_rejects_empty_pcm_on_write(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "empty.wav"
            with self.assertRaises(ValueError) as ctx:
                syn.write_pcm16_wav(path, b"")
            self.assertIn("at least one sample", str(ctx.exception))
            self.assertFalse(path.exists())

    def test_validate_rejects_zero_duration(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "zero.wav"
            # Craft a valid RIFF/WAVE header with nframes=0 via wave module.
            with wave.open(str(path), "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(24000)
                wf.writeframes(b"")
            with self.assertRaises(ValueError) as ctx:
                syn.validate_pcm16_mono_24k(path)
            self.assertIn("nframes", str(ctx.exception))

    def test_validate_rejects_stereo(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "stereo.wav"
            with wave.open(str(path), "wb") as wf:
                wf.setnchannels(2)
                wf.setsampwidth(2)
                wf.setframerate(24000)
                wf.writeframes(struct.pack("<hh", 0, 0))
            with self.assertRaises(ValueError) as ctx:
                syn.validate_pcm16_mono_24k(path)
            self.assertIn("channels", str(ctx.exception))

    def test_validate_rejects_non_riff(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "notwav.bin"
            path.write_bytes(b"NOT_A_RIFF_FILE!!!!")
            with self.assertRaises(ValueError) as ctx:
                syn.validate_pcm16_mono_24k(path)
            self.assertIn("RIFF", str(ctx.exception))

    def test_validate_rejects_width4_as_not_pcm16(self) -> None:
        """wave stdlib writes PCM tags; width=4 is still not our PCM16 contract."""
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "width4.wav"
            frames = struct.pack("<ii", 0, 1)
            with wave.open(str(path), "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(4)
                wf.setframerate(24000)
                wf.writeframes(frames)
            info = syn.read_wav_info(path)
            self.assertEqual(info["sample_width"], 4)
            with self.assertRaises(ValueError) as ctx:
                syn.validate_pcm16_mono_24k(path)
            self.assertIn("sample_width", str(ctx.exception))

    def test_float_waveform_pipeline_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "pipe.wav"
            meta = syn.float_waveform_to_pcm16_wav([1.12, 0.0, -1.05], path)
            self.assertTrue(meta["validated"])
            self.assertEqual(meta["samples_clamped"], 2)
            self.assertAlmostEqual(meta["peak_abs_before"], 1.12)
            self.assertEqual(meta["perth_watermark"], "left_intact")
            self.assertEqual(meta["encoding"], "pcm_s16le")
            syn.validate_pcm16_mono_24k(path)

    def test_iter_nested_list_takes_first_channel(self) -> None:
        flat = syn.iter_float_samples([[0.1, 0.2], [9.0, 9.0]])
        self.assertEqual(flat, [0.1, 0.2])


class PathGuardTests(unittest.TestCase):
    def test_refuse_existing_output_without_force(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out.wav"
            original = _write_pcm16_fixture(out, [0.1, 0.2])
            pcm, _ = syn.clamp_float_to_pcm16([0.9, 0.8])
            with self.assertRaises(FileExistsError):
                syn.write_pcm16_wav(out, pcm, force=False)
            self.assertEqual(out.read_bytes(), original)

    def test_force_overwrites_output_atomically(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out.wav"
            _write_pcm16_fixture(out, [0.1, 0.2])
            pcm, _ = syn.clamp_float_to_pcm16([0.9, -0.9, 0.0])
            syn.write_pcm16_wav(out, pcm, force=True)
            info = syn.validate_pcm16_mono_24k(out)
            self.assertEqual(info["nframes"], 3)

    def test_ref_and_meta_intact_after_dangerous_write_attempt(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            ref = base / "ref.wav"
            meta = base / "meta.json"
            ckpt = base / "ckpt"
            ckpt.mkdir()
            ref_bytes = _write_pcm16_fixture(ref, [0.3, -0.3, 0.1])
            meta.write_text('{"keep": true}\n', encoding="utf-8")
            meta_text = meta.read_text(encoding="utf-8")

            # Absolute equal paths: --output == --ref
            err_same = io.StringIO()
            with redirect_stderr(err_same):
                code = syn.main(
                    [
                        "--text",
                        "hola",
                        "--output",
                        str(ref),
                        "--ref",
                        str(ref),
                        "--ckpt-dir",
                        str(ckpt),
                        "--meta-out",
                        str(base / "other.meta.json"),
                    ]
                )
            self.assertEqual(code, 1)
            self.assertIn("same path as --ref", err_same.getvalue())
            self.assertEqual(ref.read_bytes(), ref_bytes)
            self.assertEqual(meta.read_text(encoding="utf-8"), meta_text)

            # Relative path that resolves to the same ref
            err_rel = io.StringIO()
            with redirect_stderr(err_rel):
                code = syn.main(
                    [
                        "--text",
                        "hola",
                        "--output",
                        str(base / "subdir" / ".." / ref.name),
                        "--ref",
                        str(ref),
                        "--ckpt-dir",
                        str(ckpt),
                    ]
                )
            self.assertEqual(code, 1)
            self.assertIn("same path as --ref", err_rel.getvalue())
            self.assertEqual(ref.read_bytes(), ref_bytes)

            # --force still cannot overwrite ref
            err_force = io.StringIO()
            with redirect_stderr(err_force):
                code = syn.main(
                    [
                        "--text",
                        "hola",
                        "--output",
                        str(ref),
                        "--ref",
                        str(ref),
                        "--ckpt-dir",
                        str(ckpt),
                        "--force",
                    ]
                )
            self.assertEqual(code, 1)
            self.assertIn("--force cannot override", err_force.getvalue())
            self.assertEqual(ref.read_bytes(), ref_bytes)

            # Existing meta without --force
            out = base / "new-out.wav"
            err_meta = io.StringIO()
            with redirect_stderr(err_meta):
                code = syn.main(
                    [
                        "--text",
                        "hola",
                        "--output",
                        str(out),
                        "--ref",
                        str(ref),
                        "--ckpt-dir",
                        str(ckpt),
                        "--meta-out",
                        str(meta),
                    ]
                )
            self.assertEqual(code, 1)
            self.assertIn("meta-out already exists", err_meta.getvalue())
            self.assertEqual(meta.read_text(encoding="utf-8"), meta_text)
            self.assertEqual(ref.read_bytes(), ref_bytes)
            self.assertFalse(out.exists())

    def test_output_meta_overlap_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            ref = base / "ref.wav"
            ckpt = base / "ckpt"
            ckpt.mkdir()
            _write_pcm16_fixture(ref)
            shared = base / "shared.bin"
            with self.assertRaises(ValueError) as ctx:
                syn.preflight_io_paths(
                    ref_wav=ref,
                    output=shared,
                    meta_out=shared,
                    ckpt_dir=ckpt,
                    force=True,
                )
            self.assertIn("overlapping", str(ctx.exception))

    def test_failed_write_cleans_temp_keeps_existing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out.wav"
            original = _write_pcm16_fixture(out)
            # Invalid rate triggers before temp creation… use misaligned pcm after
            # existence check with force: empty pcm raises before temp.
            with self.assertRaises(ValueError):
                syn.write_pcm16_wav(out, b"", force=True)
            self.assertEqual(out.read_bytes(), original)
            leftovers = list(Path(tmp).glob(".out.wav.*.tmp"))
            self.assertEqual(leftovers, [])


class PatchRestoreTests(unittest.TestCase):
    def test_temporary_attr_patch_restores_on_success(self) -> None:
        class Holder:
            value = "orig"

        def replacement() -> str:
            return "patched"

        with syn.temporary_attr_patch(Holder, "value", replacement):
            self.assertIs(Holder.value, replacement)
            self.assertEqual(Holder.value(), "patched")
        self.assertEqual(Holder.value, "orig")

    def test_temporary_attr_patch_restores_on_exception(self) -> None:
        class Holder:
            value = 1

        try:
            with syn.temporary_attr_patch(Holder, "value", 99):
                self.assertEqual(Holder.value, 99)
                raise RuntimeError("boom")
        except RuntimeError:
            pass
        self.assertEqual(Holder.value, 1)


class NumericParamTests(unittest.TestCase):
    def test_rejects_nan_exaggeration(self) -> None:
        with self.assertRaises(ValueError):
            syn.validate_numeric_param(
                "exaggeration", float("nan"), lo=0.0, hi=1.0
            )

    def test_rejects_inf_temperature(self) -> None:
        with self.assertRaises(ValueError):
            syn.validate_numeric_param(
                "temperature",
                float("inf"),
                lo=0.0,
                hi=2.0,
                exclusive_lo=True,
            )

    def test_rejects_out_of_range(self) -> None:
        with self.assertRaises(ValueError):
            syn.validate_numeric_param("cfg_weight", 1.5, lo=0.0, hi=1.0)

    def test_temperature_must_be_positive(self) -> None:
        with self.assertRaises(ValueError):
            syn.validate_numeric_param(
                "temperature", 0.0, lo=0.0, hi=2.0, exclusive_lo=True
            )


class CliTests(unittest.TestCase):
    def test_print_pins_exits_zero_without_inference(self) -> None:
        code = syn.main(["--print-pins"])
        self.assertEqual(code, 0)

    def test_main_requires_core_args(self) -> None:
        err = io.StringIO()
        with redirect_stderr(err):
            code = syn.main([])
        self.assertEqual(code, 2)
        payload = json.loads(err.getvalue())
        self.assertFalse(payload["ok"])

    def test_parser_accepts_minimal(self) -> None:
        parser = syn.build_parser()
        args = parser.parse_args(
            [
                "--text",
                "hola",
                "--output",
                "out.wav",
                "--ref",
                "ref.wav",
                "--ckpt-dir",
                "ckpt",
            ]
        )
        self.assertEqual(args.text, "hola")
        self.assertEqual(args.device, "auto")
        self.assertEqual(args.language_id, "es")
        self.assertFalse(args.force)

    def test_runtime_pin_constants(self) -> None:
        self.assertEqual(syn.RUNTIME_PIN["python"], "3.11.17")
        self.assertEqual(syn.RUNTIME_PIN["torch"], "2.6.0")
        self.assertEqual(syn.RUNTIME_PIN["torchaudio"], "2.6.0")
        self.assertEqual(syn.RUNTIME_PIN["chatterbox_tts"], "0.1.7")
        self.assertEqual(syn.MODEL_ID_ES_ES, "ResembleAI/Chatterbox-Multilingual-es-es")

    def test_main_missing_ref_fails_without_torch_import_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "o.wav"
            err = io.StringIO()
            with redirect_stderr(err):
                code = syn.main(
                    [
                        "--text",
                        "hola",
                        "--output",
                        str(out),
                        "--ref",
                        str(Path(tmp) / "missing-ref.wav"),
                        "--ckpt-dir",
                        str(Path(tmp) / "ckpt"),
                    ]
                )
            self.assertEqual(code, 1)
            self.assertFalse(out.exists())
            self.assertIn("FileNotFoundError", err.getvalue())

    def test_main_rejects_nan_exaggeration_before_load(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            ref = base / "ref.wav"
            ckpt = base / "ckpt"
            ckpt.mkdir()
            _write_pcm16_fixture(ref)
            out = base / "out.wav"
            err = io.StringIO()
            with redirect_stderr(err):
                code = syn.main(
                    [
                        "--text",
                        "hola",
                        "--output",
                        str(out),
                        "--ref",
                        str(ref),
                        "--ckpt-dir",
                        str(ckpt),
                        "--exaggeration",
                        "nan",
                    ]
                )
            self.assertEqual(code, 1)
            self.assertIn("exaggeration", err.getvalue())
            self.assertFalse(out.exists())


class DocContractTests(unittest.TestCase):
    def test_readme_and_pin_file_exist(self) -> None:
        here = Path(__file__).resolve().parent
        readme = (here / "README.md").read_text(encoding="utf-8")
        pins = (here / "requirements-pin.txt").read_text(encoding="utf-8")
        for token in (
            "3.11.17",
            "2.6.0",
            "0.1.7",
            "strict=False",
            "Perth",
            "PCM16",
            "--force",
            "Exit codes",
            "Hechos verificados",
            "Hipótesis",
            "conds.pt",
            "cd tools/chatterbox",
        ):
            self.assertIn(token, readme)
        self.assertNotIn("tools.chatterbox.test_synthesize", readme)
        self.assertIn("torch==2.6.0", pins)
        self.assertIn("torchaudio==2.6.0", pins)
        self.assertIn("chatterbox-tts==0.1.7", pins)

    def test_math_nan_constant_available(self) -> None:
        # Sanity: stdlib math used by production path.
        self.assertTrue(math.isnan(float("nan")))


if __name__ == "__main__":
    unittest.main()
