import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import path from 'node:path';

type WavInfo = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  data: Buffer;
};

const readWavPcm = (filePath: string): WavInfo => {
  const buf = readFileSync(filePath);
  if (buf.toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error(`No es WAV: ${filePath}`);
  }
  const channels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const bitsPerSample = buf.readUInt16LE(34);
  let offset = 12;
  while (offset < buf.length - 8) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'data') {
      // OpenAI WAV often uses size=0xFFFFFFFF — use remainder of file
      const dataSize =
        size === 0xffffffff
          ? Math.max(0, buf.length - (offset + 8))
          : size;
      return {
        sampleRate,
        channels,
        bitsPerSample,
        data: buf.subarray(offset + 8, offset + 8 + dataSize),
      };
    }
    offset += 8 + (size === 0xffffffff ? 0 : size);
    if (size === 0xffffffff) break;
  }
  throw new Error(`Sin chunk data: ${filePath}`);
};

const writeWav = (
  filePath: string,
  info: {sampleRate: number; channels: number; bitsPerSample: number},
  pcm: Buffer,
) => {
  const dataSize = pcm.length;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(info.channels, 22);
  buffer.writeUInt32LE(info.sampleRate, 24);
  const byteRate = (info.sampleRate * info.channels * info.bitsPerSample) / 8;
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE((info.channels * info.bitsPerSample) / 8, 32);
  buffer.writeUInt16LE(info.bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcm.copy(buffer, 44);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, buffer);
};

export const makeSilenceWav = (
  filePath: string,
  durationSeconds: number,
  sampleRate = 24000,
): string => {
  const samples = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const pcm = Buffer.alloc(samples * 2);
  writeWav(filePath, {sampleRate, channels: 1, bitsPerSample: 16}, pcm);
  return filePath;
};

/**
 * Concatenate WAV files (mono 16-bit). Resamples are not done — inputs should match.
 * OpenAI TTS is 24kHz mono PCM.
 */
export const concatWavFiles = (
  inputs: string[],
  outputPath: string,
): {durationSeconds: number; sampleRate: number} => {
  if (!inputs.length) throw new Error('concatWavFiles: sin entradas');
  const parts = inputs.filter((f) => existsSync(f)).map(readWavPcm);
  if (!parts.length) throw new Error('concatWavFiles: archivos inválidos');

  const sampleRate = parts[0]!.sampleRate;
  const channels = parts[0]!.channels;
  const bitsPerSample = parts[0]!.bitsPerSample;
  const pcm = Buffer.concat(parts.map((p) => p.data));
  writeWav(outputPath, {sampleRate, channels, bitsPerSample}, pcm);
  const durationSeconds =
    pcm.length / ((sampleRate * channels * bitsPerSample) / 8);
  return {durationSeconds, sampleRate};
};

/** @deprecated Kept for tests; sentence pauses are no longer inserted. */
export const PAUSE_SENTENCE_SEC = 0;
/** Pause after "punto y aparte" / entre escenas (only intentional silence). */
/** Pause between scenes — keep short for Shorts pacing */
export const PAUSE_PARAGRAPH_SEC = 0.35;
