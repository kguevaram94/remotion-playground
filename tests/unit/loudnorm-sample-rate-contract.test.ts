/**
 * T-CHATTERBOX-007C-R2 — unit contract for narration loudnorm sample rate.
 *
 * These tests assert FFmpeg *arguments* / declared constants and that the
 * ensureNarrationLoudnorm path invokes loudnormAudio. They do NOT run FFmpeg,
 * do NOT probe real output WAVs, and do NOT claim measured sample-rate,
 * duration, or A/V sync after loudnorm.
 *
 * Real FFmpeg validation (output sr = 24 kHz, duration vs
 * SINGLE_TAKE_DURATION_TOLERANCE_SEC, PCM probe, AAC in MP4) remains pending
 * human authorization — see tasks/approvals.md § 007C-R2.
 */
import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const loudnormAudioMock = vi.fn();

vi.mock('../../src/shorts/media/ffmpeg', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/shorts/media/ffmpeg')>();
  return {
    ...actual,
    loudnormAudio: (...args: Parameters<typeof actual.loudnormAudio>) =>
      loudnormAudioMock(...args),
  };
});

import {
  buildLoudnormFfmpegArgs,
  NARRATION_LOUDNORM_FILTER,
  NARRATION_LOUDNORM_SAMPLE_RATE,
} from '../../src/shorts/media/ffmpeg';
import {ensureNarrationLoudnorm} from '../../src/shorts/media/narration-loudnorm';
import {SINGLE_TAKE_DURATION_TOLERANCE_SEC} from '../../src/shorts/voice/single-take';

describe('loudnorm sample-rate contract (unit · args / constants only)', () => {
  it('declares the approved output sample rate of 24_000 Hz', () => {
    expect(NARRATION_LOUDNORM_SAMPLE_RATE).toBe(24_000);
  });

  it('keeps the approved loudnorm filter (volume params unchanged)', () => {
    expect(NARRATION_LOUDNORM_FILTER).toBe('loudnorm=I=-16:TP=-1.5:LRA=11');
  });

  it('buildLoudnormFfmpegArgs sets -ar 24000 explicitly (no implicit FFmpeg rate)', () => {
    const args = buildLoudnormFfmpegArgs('/in/narration.wav', '/out/ln.wav');
    const arIdx = args.indexOf('-ar');
    expect(arIdx).toBeGreaterThan(-1);
    expect(args[arIdx + 1]).toBe(String(NARRATION_LOUDNORM_SAMPLE_RATE));
    expect(args[arIdx + 1]).toBe('24000');
    expect(args).toContain('-af');
    expect(args[args.indexOf('-af') + 1]).toBe(NARRATION_LOUDNORM_FILTER);
    expect(args[0]).toBe('-y');
    expect(args).toContain('/in/narration.wav');
    expect(args[args.length - 1]).toBe('/out/ln.wav');
  });

  it('buildLoudnormFfmpegArgs requests PCM16 mono (consumer-compatible WAV)', () => {
    const args = buildLoudnormFfmpegArgs('/in/a.wav', '/out/b.wav');
    expect(args[args.indexOf('-ac') + 1]).toBe('1');
    expect(args[args.indexOf('-c:a') + 1]).toBe('pcm_s16le');
  });

  it('does not introduce tempo/atempo filters that would drift duration', () => {
    const args = buildLoudnormFfmpegArgs('/in/a.wav', '/out/b.wav');
    const af = String(args[args.indexOf('-af') + 1] ?? '');
    expect(af).not.toMatch(/atempo|tempo|asetrate|rubberband/i);
    // No duration measurement here (would require real FFmpeg).
    // Document the only project tolerance already defined for WAV↔authorship:
    expect(SINGLE_TAKE_DURATION_TOLERANCE_SEC).toBe(0.05);
  });
});

describe('ensureNarrationLoudnorm → loudnormAudio (unit · mocked loudnorm)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ln-ar-'));
    loudnormAudioMock.mockReset();
    loudnormAudioMock.mockImplementation(
      (_input: string, outputWav: string): boolean => {
        // Placeholder bytes — NOT a real loudnorm WAV / NOT sample-rate evidence.
        writeFileSync(outputWav, 'stub-not-a-measured-wav');
        return true;
      },
    );
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('normalization path calls loudnormAudio (approved config lives in buildLoudnormFfmpegArgs)', () => {
    const raw = path.join(dir, 'narration.wav');
    writeFileSync(raw, 'raw-bytes');

    const result = ensureNarrationLoudnorm({
      jobDir: dir,
      narrationAudio: raw,
      isTestAudio: false,
    });

    expect(loudnormAudioMock).toHaveBeenCalledTimes(1);
    expect(loudnormAudioMock).toHaveBeenCalledWith(
      raw,
      path.join(dir, 'narration-loudnorm.wav'),
    );
    expect(result.applied).toBe(true);
    expect(result.loudnormPath).toBe(path.join(dir, 'narration-loudnorm.wav'));
    expect(existsSync(result.loudnormPath!)).toBe(true);

    // Production loudnormAudio must use the same argv builder (source contract).
    const productionArgs = buildLoudnormFfmpegArgs(
      raw,
      path.join(dir, 'narration-loudnorm.wav'),
    );
    expect(productionArgs[productionArgs.indexOf('-ar') + 1]).toBe('24000');
    expect(productionArgs).toContain(NARRATION_LOUDNORM_FILTER);
  });
});
