import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  probePcmWav,
  readWavDurationSeconds,
  WavProbeError,
} from '../../src/shorts/media/wav-probe';
import {writeTestWav} from '../../src/shorts/voice/provider';

type FmtOverrides = {
  audioFormat?: number;
  channels?: number;
  sampleRate?: number;
  byteRate?: number;
  blockAlign?: number;
  bitsPerSample?: number;
  fmtSize?: number;
};

/**
 * Build a PCM WAV with explicit control over fmt fields, optional odd-sized
 * JUNK before data, and data size / payload length.
 */
const writeCustomWav = (
  filePath: string,
  options: {
    numFrames: number;
    fmt?: FmtOverrides;
    dataSizeField?: number;
    /** Actual PCM bytes written (defaults to frames × blockAlign). */
    pcmByteLength?: number;
    omitData?: boolean;
    /** Insert a JUNK chunk with odd payload size (1) + RIFF pad before data. */
    oddJunkBeforeData?: boolean;
    /** Truncate file so fmt declares more bytes than available. */
    truncateAfterFmtHeader?: boolean;
  },
): void => {
  const fmt = options.fmt ?? {};
  const audioFormat = fmt.audioFormat ?? 1;
  const channels = fmt.channels ?? 1;
  const sampleRate = fmt.sampleRate ?? 24000;
  const bitsPerSample = fmt.bitsPerSample ?? 16;
  const bytesPerSample = bitsPerSample % 8 === 0 ? bitsPerSample / 8 : 2;
  const blockAlign =
    fmt.blockAlign ?? Math.max(1, channels) * Math.max(1, bytesPerSample);
  const byteRate = fmt.byteRate ?? sampleRate * blockAlign;
  const fmtSize = fmt.fmtSize ?? 16;

  const pcmLen =
    options.pcmByteLength ??
    Math.max(0, options.numFrames) * Math.max(1, blockAlign);
  const pcm = Buffer.alloc(pcmLen);
  for (let i = 0; i + 1 < pcmLen; i += 2) {
    pcm.writeInt16LE((i * 3) % 2000, i);
  }

  const junkPayload = options.oddJunkBeforeData ? 1 : 0;
  const junkChunkBytes = options.oddJunkBeforeData
    ? 8 + junkPayload + 1 /* pad */
    : 0;

  const omitData = options.omitData === true;
  const dataSizeField = omitData ? 0 : (options.dataSizeField ?? pcmLen);
  const storedPcm = omitData
    ? 0
    : dataSizeField === 0xffffffff
      ? pcmLen
      : Math.min(pcmLen, dataSizeField === 0 ? 0 : pcmLen);

  const dataChunkBytes = omitData ? 0 : 8 + storedPcm;

  // fmt payload may be larger than 16 (we still only need 16 coherent fields).
  const fmtPayload = Buffer.alloc(Math.max(fmtSize, 16));
  fmtPayload.writeUInt16LE(audioFormat, 0);
  fmtPayload.writeUInt16LE(channels, 2);
  fmtPayload.writeUInt32LE(sampleRate, 4);
  fmtPayload.writeUInt32LE(byteRate >>> 0, 8);
  fmtPayload.writeUInt16LE(blockAlign, 12);
  fmtPayload.writeUInt16LE(bitsPerSample, 14);

  if (options.truncateAfterFmtHeader) {
    // File length >= 44 (passes short-file gate) but fmt.size ≫ available.
    const buf = Buffer.alloc(44);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(100, 16); // claims 100 bytes; only 24 follow
    mkdirSync(path.dirname(filePath), {recursive: true});
    writeFileSync(filePath, buf);
    return;
  }

  const fmtPad = fmtSize & 1 ? 1 : 0;
  const riffPayloadSize =
    4 + 8 + fmtSize + fmtPad + junkChunkBytes + (omitData ? 0 : dataChunkBytes);
  const buf = Buffer.alloc(8 + riffPayloadSize);
  let o = 0;
  buf.write('RIFF', o);
  o += 4;
  buf.writeUInt32LE(riffPayloadSize, o);
  o += 4;
  buf.write('WAVE', o);
  o += 4;
  buf.write('fmt ', o);
  o += 4;
  buf.writeUInt32LE(fmtSize, o);
  o += 4;
  fmtPayload.subarray(0, fmtSize).copy(buf, o);
  o += fmtSize;
  if (fmtPad) {
    buf[o] = 0;
    o += 1;
  }

  if (options.oddJunkBeforeData) {
    buf.write('JUNK', o);
    o += 4;
    buf.writeUInt32LE(junkPayload, o);
    o += 4;
    buf[o] = 0xaa;
    o += 1;
    buf[o] = 0; // RIFF pad
    o += 1;
  }

  if (!omitData) {
    buf.write('data', o);
    o += 4;
    buf.writeUInt32LE(dataSizeField >>> 0, o);
    o += 4;
    pcm.subarray(0, storedPcm).copy(buf, o);
  }

  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, buf);
};

/** Minimal PCM16 mono WAV (legacy helper for existing cases). */
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
  writeCustomWav(filePath, {
    numFrames: options.numSamples,
    omitData: options.omitData,
    dataSizeField: options.dataSizeField,
    fmt: {
      audioFormat: options.audioFormat ?? 1,
      channels: 1,
      sampleRate: options.sampleRate,
      bitsPerSample: 16,
      blockAlign: 2,
      byteRate: options.sampleRate * 2,
    },
  });
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
    expect(probe.dataBytes).toBe(96000);
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

  it('floors 0xffffffff data to complete PCM frames (trailing partial ignored)', () => {
    const file = path.join(dir, 'openai-partial.wav');
    // 1000 complete frames (2000 bytes) + 1 leftover byte under sentinel size.
    writeCustomWav(file, {
      numFrames: 1000,
      pcmByteLength: 2001,
      dataSizeField: 0xffffffff,
      fmt: {
        sampleRate: 1000,
        channels: 1,
        bitsPerSample: 16,
        blockAlign: 2,
        byteRate: 2000,
      },
    });
    const probe = probePcmWav(file);
    expect(probe.dataBytes).toBe(2000);
    expect(probe.durationSeconds).toBeCloseTo(1, 6);
  });

  it('rejects 0xffffffff data when no complete PCM frame is present', () => {
    const file = path.join(dir, 'openai-empty.wav');
    writeCustomWav(file, {
      numFrames: 0,
      pcmByteLength: 1,
      dataSizeField: 0xffffffff,
      fmt: {
        sampleRate: 8000,
        channels: 1,
        bitsPerSample: 16,
        blockAlign: 2,
        byteRate: 16000,
      },
    });
    expect(() => probePcmWav(file)).toThrow(/sin muestras/);
    expect(readWavDurationSeconds(file)).toBeNull();
  });

  it('rejects truncated data chunk (declared size > available)', () => {
    const file = path.join(dir, 'trunc.wav');
    writePcm16MonoWav(file, {sampleRate: 24000, numSamples: 1000});
    const buf = readFileSync(file);
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

  it('rejects empty data chunk', () => {
    const file = path.join(dir, 'empty-data.wav');
    writeCustomWav(file, {
      numFrames: 0,
      pcmByteLength: 0,
      dataSizeField: 0,
      fmt: {
        sampleRate: 24000,
        channels: 1,
        bitsPerSample: 16,
        blockAlign: 2,
        byteRate: 48000,
      },
    });
    expect(() => probePcmWav(file)).toThrow(/sin muestras/);
  });

  it('rejects data size not divisible by frame size', () => {
    const file = path.join(dir, 'misaligned.wav');
    writeCustomWav(file, {
      numFrames: 10,
      pcmByteLength: 21, // frame = 2
      dataSizeField: 21,
      fmt: {
        sampleRate: 8000,
        channels: 1,
        bitsPerSample: 16,
        blockAlign: 2,
        byteRate: 16000,
      },
    });
    expect(() => probePcmWav(file)).toThrow(/alineado a frame/);
  });

  it('rejects fmt shorter than mandatory fields', () => {
    const file = path.join(dir, 'fmt-short.wav');
    writeCustomWav(file, {
      numFrames: 100,
      fmt: {
        fmtSize: 14,
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        blockAlign: 2,
        byteRate: 32000,
      },
    });
    expect(() => probePcmWav(file)).toThrow(/fmt demasiado corto/);
  });

  it('rejects fmt.size greater than available payload bytes', () => {
    const file = path.join(dir, 'fmt-trunc.wav');
    writeCustomWav(file, {
      numFrames: 0,
      truncateAfterFmtHeader: true,
      fmt: {fmtSize: 16},
    });
    expect(() => probePcmWav(file)).toThrow(/fmt truncado/);
  });

  it('rejects channels = 0', () => {
    const file = path.join(dir, 'ch0.wav');
    writeCustomWav(file, {
      numFrames: 100,
      pcmByteLength: 200,
      fmt: {
        channels: 0,
        sampleRate: 16000,
        bitsPerSample: 16,
        blockAlign: 2,
        byteRate: 32000,
      },
    });
    expect(() => probePcmWav(file)).toThrow(/channels=0/);
  });

  it('rejects sampleRate = 0', () => {
    const file = path.join(dir, 'rate0.wav');
    writeCustomWav(file, {
      numFrames: 100,
      pcmByteLength: 200,
      fmt: {
        channels: 1,
        sampleRate: 0,
        bitsPerSample: 16,
        blockAlign: 2,
        byteRate: 0,
      },
    });
    expect(() => probePcmWav(file)).toThrow(/rate=0/);
  });

  it('rejects unsupported bitsPerSample (not divisible by 8)', () => {
    const file = path.join(dir, 'bits12.wav');
    writeCustomWav(file, {
      numFrames: 100,
      pcmByteLength: 200,
      fmt: {
        channels: 1,
        sampleRate: 16000,
        bitsPerSample: 12,
        blockAlign: 2,
        byteRate: 32000,
      },
    });
    expect(() => probePcmWav(file)).toThrow(/bitsPerSample/);
  });

  it('rejects incorrect nBlockAlign', () => {
    const file = path.join(dir, 'bad-align.wav');
    writeCustomWav(file, {
      numFrames: 100,
      pcmByteLength: 200,
      fmt: {
        channels: 1,
        sampleRate: 16000,
        bitsPerSample: 16,
        blockAlign: 1, // should be 2
        byteRate: 32000,
      },
    });
    expect(() => probePcmWav(file)).toThrow(/nBlockAlign/);
  });

  it('rejects incorrect nAvgBytesPerSec', () => {
    const file = path.join(dir, 'bad-rate.wav');
    writeCustomWav(file, {
      numFrames: 100,
      pcmByteLength: 200,
      fmt: {
        channels: 1,
        sampleRate: 16000,
        bitsPerSample: 16,
        blockAlign: 2,
        byteRate: 999, // should be 32000
      },
    });
    expect(() => probePcmWav(file)).toThrow(/nAvgBytesPerSec/);
  });

  it('rejects truncated non-data chunk (incoherent RIFF sizes/offsets)', () => {
    const file = path.join(dir, 'junk-trunc.wav');
    // Valid fmt, then JUNK claiming more bytes than remain (no data reachable).
    const fmtSize = 16;
    const buf = Buffer.alloc(12 + 8 + fmtSize + 8);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(4 + 8 + fmtSize + 8, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(fmtSize, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(16000, 24);
    buf.writeUInt32LE(32000, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write('JUNK', 36);
    buf.writeUInt32LE(50_000, 40); // declared ≫ available (0)
    writeFileSync(file, buf);
    expect(() => probePcmWav(file)).toThrow(/truncado/);
  });

  it('accepts odd-sized chunk with RIFF padding before data', () => {
    const file = path.join(dir, 'odd-pad.wav');
    writeCustomWav(file, {
      numFrames: 8000,
      oddJunkBeforeData: true,
      fmt: {
        sampleRate: 8000,
        channels: 1,
        bitsPerSample: 16,
        blockAlign: 2,
        byteRate: 16000,
      },
    });
    const probe = probePcmWav(file);
    expect(probe.durationSeconds).toBeCloseTo(1, 6);
    expect(probe.sampleRate).toBe(8000);
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
