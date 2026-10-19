import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  ensureNarrationLoudnorm,
  resolveNarrationForRender,
} from '../../src/shorts/media/narration-loudnorm';
import {ffmpegAvailable} from '../../src/shorts/media/ffmpeg';

describe('resolveNarrationForRender', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ln-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('prefers loudnorm when not test audio', () => {
    const raw = path.join(dir, 'narration.wav');
    const ln = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(raw, 'raw');
    writeFileSync(ln, 'ln');
    expect(
      resolveNarrationForRender({
        narrationAudio: raw,
        narrationLoudnorm: ln,
        isTestAudio: false,
      }),
    ).toBe(ln);
  });

  it('uses raw narration for mock audio even if loudnorm exists', () => {
    const raw = path.join(dir, 'narration.wav');
    const ln = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(raw, 'raw');
    writeFileSync(ln, 'ln');
    expect(
      resolveNarrationForRender({
        narrationAudio: raw,
        narrationLoudnorm: ln,
        isTestAudio: true,
      }),
    ).toBe(raw);
  });

  it('falls back to raw when loudnorm missing', () => {
    const raw = path.join(dir, 'narration.wav');
    writeFileSync(raw, 'raw');
    expect(
      resolveNarrationForRender({
        narrationAudio: raw,
        isTestAudio: false,
      }),
    ).toBe(raw);
  });
});

describe('ensureNarrationLoudnorm', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ln-ens-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('skips loudnorm for test audio and removes stale file', () => {
    const raw = path.join(dir, 'narration.wav');
    const stale = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(raw, 'raw');
    writeFileSync(stale, 'stale');
    const result = ensureNarrationLoudnorm({
      jobDir: dir,
      narrationAudio: raw,
      isTestAudio: true,
    });
    expect(result.applied).toBe(false);
    expect(result.usedPath).toBe(raw);
    expect(existsSync(stale)).toBe(false);
  });

  it('applies loudnorm when ffmpeg is available', () => {
    if (!ffmpegAvailable()) return;
    // Minimal valid-ish WAV header + silence so ffmpeg can read it
    const raw = path.join(dir, 'narration.wav');
    const sampleRate = 24000;
    const samples = sampleRate; // 1s silence
    const dataSize = samples * 2;
    const buf = Buffer.alloc(44 + dataSize);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(sampleRate * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(dataSize, 40);
    writeFileSync(raw, buf);

    const result = ensureNarrationLoudnorm({
      jobDir: dir,
      narrationAudio: raw,
      isTestAudio: false,
    });
    expect(result.applied).toBe(true);
    expect(result.loudnormPath).toBeTruthy();
    expect(existsSync(result.loudnormPath!)).toBe(true);
    expect(result.usedPath).toBe(result.loudnormPath);
  });
});
