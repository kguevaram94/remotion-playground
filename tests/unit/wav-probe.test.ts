import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  probePcmWav,
  readWavDurationSeconds,
  WavProbeError,
} from '../../src/shorts/media/wav-probe';
import {writeTestWav} from '../../src/shorts/voice/provider';

/** Minimal PCM16 mono WAV with optional data-chunk size override. */
const writePcm16MonoWav = (
  filePath: string,
  options: {
    sampleRate: number;
    numSamples: number;
    dataSizeField?: number;
    omitData?: boolean;
    audioFormat?: number;
  },
): void => {
  const {
    sampleRate,
    numSamples,
    dataSizeField,
    omitData = false,
    audioFormat = 1,
  } = options;
  const pcm = Buffer.alloc(numSamples * 2);
  for (let i = 0; i < numSamples; i++) {
    pcm.writeInt16LE(Math.floor(Math.sin(i / 10) * 1000), i * 2);
  }
  const dataChunkSize = omitData ? 0 : dataSizeField ?? pcm.length;
  const fmtSize = 16;
  // For 0xffffffff we still write real pcm bytes after the header.
  const fileDataBytes = omitData
    ? 0
    : dataSizeField === 0xffffffff
      ? pcm.length
      : dataChunkSize;
  const buf = Buffer.alloc(12 + 8 + fmtSize + (omitData ? 0 : 8 + fileDataBytes));
  buf.write('RIFF', 0);
  buf.writeUInt32LE(4 + 8 + fmtSize + (omitData ? 0 : 8 + fileDataBytes), 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(fmtSize, 16);
  buf.writeUInt16LE(audioFormat, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  if (!omitData) {
    buf.write('data', 36);
    buf.writeUInt32LE(dataChunkSize, 40);
    pcm.subarray(0, fileDataBytes).copy(buf, 44);
  }
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, buf);
};

describe('wav-probe', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'wav-probe-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('reads duration and rate from a valid PCM WAV', () => {
    const file = path.join(dir, 'ok.wav');
    writePcm16MonoWav(file, {sampleRate: 24000, numSamples: 48000});
    const probe = probePcmWav(file);
    expect(probe.sampleRate).toBe(24000);
    expect(probe.durationSeconds).toBeCloseTo(2, 6);
    expect(probe.channels).toBe(1);
    expect(probe.bitsPerSample).toBe(16);
    expect(readWavDurationSeconds(file)).toBeCloseTo(2, 6);
  });

  it('handles data size 0xffffffff using remaining file bytes', () => {
    const file = path.join(dir, 'openai-style.wav');
    writePcm16MonoWav(file, {
      sampleRate: 24000,
      numSamples: 24000,
      dataSizeField: 0xffffffff,
    });
    const probe = probePcmWav(file);
    expect(probe.durationSeconds).toBeCloseTo(1, 6);
    expect(probe.dataBytes).toBe(48000);
  });

  it('rejects truncated data chunk (declared size > available)', () => {
    const file = path.join(dir, 'trunc.wav');
    writePcm16MonoWav(file, {sampleRate: 24000, numSamples: 1000});
    const buf = require('node:fs').readFileSync(file) as Buffer;
    // Claim huge data size while keeping short file
    buf.writeUInt32LE(5_000_000, 40);
    writeFileSync(file, buf);
    expect(() => probePcmWav(file)).toThrow(WavProbeError);
    expect(() => probePcmWav(file)).toThrow(/truncado/);
    expect(readWavDurationSeconds(file)).toBeNull();
  });

  it('rejects non-RIFF and missing data', () => {
    const notRiff = path.join(dir, 'x.bin');
    writeFileSync(notRiff, Buffer.alloc(64, 1));
    expect(() => probePcmWav(notRiff)).toThrow(/RIFF/);

    const noData = path.join(dir, 'nodata.wav');
    writePcm16MonoWav(noData, {
      sampleRate: 16000,
      numSamples: 100,
      omitData: true,
    });
    expect(() => probePcmWav(noData)).toThrow(/data/);
  });

  it('rejects non-PCM audioFormat', () => {
    const file = path.join(dir, 'float.wav');
    writePcm16MonoWav(file, {
      sampleRate: 24000,
      numSamples: 1000,
      audioFormat: 3,
    });
    expect(() => probePcmWav(file)).toThrow(/PCM/);
  });

  it('returns null from soft reader on missing file', () => {
    expect(readWavDurationSeconds(path.join(dir, 'missing.wav'))).toBeNull();
  });

  it('agrees with writeTestWav duration', () => {
    const file = path.join(dir, 'tone.wav');
    const written = writeTestWav(file, 0.5);
    const probe = probePcmWav(file);
    expect(probe.sampleRate).toBe(written.sampleRate);
    expect(probe.durationSeconds).toBeCloseTo(written.durationSeconds, 6);
  });
});
