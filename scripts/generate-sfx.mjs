/**
 * Procedural SFX WAVs for ShortVideo animations.
 * Run: node scripts/generate-sfx.mjs
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/sfx');
mkdirSync(outDir, {recursive: true});

const writeWav = (filePath, sampleRate, samples) => {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i])) * 32767;
    buffer.writeInt16LE(Math.floor(s), 44 + i * 2);
  }
  writeFileSync(filePath, buffer);
};

const sampleRate = 22050;

// Short countdown tick
{
  const n = Math.floor(0.06 * sampleRate);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 55);
    samples[i] =
      Math.sin(2 * Math.PI * 880 * t) * 0.45 * env +
      Math.sin(2 * Math.PI * 1320 * t) * 0.15 * env;
  }
  writeWav(path.join(outDir, 'tick.wav'), sampleRate, samples);
}

// Soft whoosh for line strokes
{
  const n = Math.floor(0.28 * sampleRate);
  const samples = new Float32Array(n);
  let noise = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    noise = noise * 0.92 + (Math.random() * 2 - 1) * 0.08;
    const env = Math.sin((Math.PI * i) / n) ** 1.2;
    const pitch = 400 + t * 1200;
    samples[i] =
      noise * 0.55 * env + Math.sin(2 * Math.PI * pitch * t) * 0.08 * env;
  }
  writeWav(path.join(outDir, 'whoosh.wav'), sampleRate, samples);
}

// Pop / reveal
{
  const n = Math.floor(0.18 * sampleRate);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 28);
    samples[i] =
      Math.sin(2 * Math.PI * 220 * t) * 0.5 * env +
      Math.sin(2 * Math.PI * 440 * t) * 0.2 * env;
  }
  writeWav(path.join(outDir, 'pop.wav'), sampleRate, samples);
}

// Soft ding for answer
{
  const n = Math.floor(0.45 * sampleRate);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 6);
    samples[i] =
      Math.sin(2 * Math.PI * 660 * t) * 0.35 * env +
      Math.sin(2 * Math.PI * 990 * t) * 0.18 * env +
      Math.sin(2 * Math.PI * 1320 * t) * 0.08 * env;
  }
  writeWav(path.join(outDir, 'ding.wav'), sampleRate, samples);
}

console.log('SFX written to', outDir);
