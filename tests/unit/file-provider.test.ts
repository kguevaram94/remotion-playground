import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {
  createHash,
} from 'node:crypto';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  statSync,
  mkdirSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  synthesizeFromFile,
  resolveCustomNarrationPath,
} from '../../src/shorts/voice/file-provider';
import {FileVoiceProvider, writeTestWav} from '../../src/shorts/voice/provider';
import {estimateNarrationSeconds} from '../../src/shorts/utils/timing';
import {WavProbeError} from '../../src/shorts/media/wav-probe';

const writePcm16MonoWav = (
  filePath: string,
  options: {
    sampleRate: number;
    numSamples: number;
    dataSizeField?: number;
    audioFormat?: number;
  },
): void => {
  const {sampleRate, numSamples, dataSizeField, audioFormat = 1} = options;
  const pcm = Buffer.alloc(numSamples * 2);
  for (let i = 0; i < numSamples; i++) {
    pcm.writeInt16LE(i % 200, i * 2);
  }
  const declared = dataSizeField ?? pcm.length;
  const stored =
    dataSizeField === 0xffffffff ? pcm.length : Math.min(declared, pcm.length);
  const buf = Buffer.alloc(44 + stored);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + stored, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(audioFormat, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(declared, 40);
  pcm.subarray(0, stored).copy(buf, 44);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, buf);
};

describe('FileVoiceProvider / synthesizeFromFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'file-voice-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('uses real duration and sampleRate from a valid PCM WAV', () => {
    const source = path.join(dir, 'src.wav');
    const out = path.join(dir, 'narration.wav');
    writePcm16MonoWav(source, {sampleRate: 24000, numSamples: 72000}); // 3.0s

    const result = synthesizeFromFile('hola', out, source);

    expect(result.durationSeconds).toBeCloseTo(3, 6);
    expect(result.sampleRate).toBe(24000);
    expect(result.provider).toBe('file');
    expect(result.isTestAudio).toBe(false);
    expect(result.model).toBe('src.wav');
    expect(result.format).toBe('wav');
    expect(result.audioPath).toBe(out);
    expect(existsSync(out)).toBe(true);
  });

  it('does not use estimateNarrationSeconds when it differs from the WAV', () => {
    const source = path.join(dir, 'short.wav');
    const out = path.join(dir, 'out.wav');
    writePcm16MonoWav(source, {sampleRate: 16000, numSamples: 8000}); // 0.5s
    const longText =
      'palabra '.repeat(80).trim(); // estimate ≫ 0.5s
    const estimated = estimateNarrationSeconds(longText);
    expect(estimated).toBeGreaterThan(1);

    const result = synthesizeFromFile(longText, out, source);

    expect(result.durationSeconds).toBeCloseTo(0.5, 6);
    expect(result.durationSeconds).not.toBeCloseTo(estimated, 1);
    const lastCue = result.cues?.[result.cues.length - 1];
    expect(lastCue?.endMs).toBeCloseTo(500, 0);
  });

  it('rejects non-RIFF input without estimating duration', () => {
    const source = path.join(dir, 'not-wav.bin');
    const out = path.join(dir, 'out.wav');
    writeFileSync(source, Buffer.alloc(2048, 7));
    expect(() => synthesizeFromFile('texto', out, source)).toThrow(WavProbeError);
    expect(existsSync(out)).toBe(false);
  });

  it('rejects truncated WAV and missing data chunk', () => {
    const trunc = path.join(dir, 'trunc.wav');
    writePcm16MonoWav(trunc, {sampleRate: 24000, numSamples: 2000});
    const buf = readFileSync(trunc);
    buf.writeUInt32LE(9_000_000, 40);
    writeFileSync(trunc, buf);
    expect(() =>
      synthesizeFromFile('x', path.join(dir, 'o1.wav'), trunc),
    ).toThrow(/truncado/);

    // fmt-only (no data): build manually
    const noData = path.join(dir, 'nodata.wav');
    const header = Buffer.alloc(36);
    header.write('RIFF', 0);
    header.writeUInt32LE(28, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(24000, 24);
    header.writeUInt32LE(48000, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    writeFileSync(noData, header);
    expect(() =>
      synthesizeFromFile('x', path.join(dir, 'o2.wav'), noData),
    ).toThrow(/data/);
  });

  it('rejects missing source path', () => {
    expect(() =>
      synthesizeFromFile('x', path.join(dir, 'o.wav'), path.join(dir, 'nope.wav')),
    ).toThrow(WavProbeError);
  });

  it('copies bytes without mutating the source and keeps coherent metadata', () => {
    const source = path.join(dir, 'me.wav');
    const out = path.join(dir, 'job', 'narration.wav');
    writePcm16MonoWav(source, {sampleRate: 22050, numSamples: 22050});
    const beforeHash = createHash('sha256').update(readFileSync(source)).digest('hex');
    const beforeSize = statSync(source).size;

    const result = synthesizeFromFile('una dos tres', out, source);

    expect(createHash('sha256').update(readFileSync(source)).digest('hex')).toBe(
      beforeHash,
    );
    expect(statSync(source).size).toBe(beforeSize);
    expect(readFileSync(out).equals(readFileSync(source))).toBe(true);
    expect(result.durationSeconds).toBeCloseTo(1, 6);
    expect(result.sampleRate).toBe(22050);
    expect(result.cues?.length).toBe(3);
  });

  it('rejects non-PCM (e.g. IEEE float) formats explicitly', () => {
    const source = path.join(dir, 'float.wav');
    writePcm16MonoWav(source, {
      sampleRate: 24000,
      numSamples: 2400,
      audioFormat: 3,
    });
    expect(() =>
      synthesizeFromFile('hola', path.join(dir, 'out.wav'), source),
    ).toThrow(/PCM/);
  });

  it('accepts 0xffffffff data size with safe remaining-byte duration', () => {
    const source = path.join(dir, 'stream.wav');
    const out = path.join(dir, 'out.wav');
    writePcm16MonoWav(source, {
      sampleRate: 24000,
      numSamples: 48000,
      dataSizeField: 0xffffffff,
    });
    const result = synthesizeFromFile('ok', out, source);
    expect(result.durationSeconds).toBeCloseTo(2, 6);
    expect(result.sampleRate).toBe(24000);
  });

  it('FileVoiceProvider resolves VOICE_FILE and synthesizes', async () => {
    const source = path.join(dir, 'custom.wav');
    // resolveCustomNarrationPath requires size > 1000
    writeTestWav(source, 0.6);
    expect(statSync(source).size).toBeGreaterThan(1000);

    const provider = new FileVoiceProvider(source);
    const out = path.join(dir, 'narration.wav');
    const result = await provider.synthesize('frase de prueba', out, {
      jobId: 'unit-file',
    });
    expect(result.provider).toBe('file');
    expect(result.durationSeconds).toBeGreaterThan(0.5);
    expect(result.sampleRate).toBe(22050);
  });

  it('resolveCustomNarrationPath ignores tiny files', () => {
    const tiny = path.join(dir, 'tiny.wav');
    writeFileSync(tiny, Buffer.alloc(100));
    expect(resolveCustomNarrationPath('any', tiny)).toBeNull();
  });
});
