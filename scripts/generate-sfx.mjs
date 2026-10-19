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

// Short countdown tick — crisp click with slight high overtone
{
  const n = Math.floor(0.07 * sampleRate);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 70);
    samples[i] =
      Math.sin(2 * Math.PI * 980 * t) * 0.5 * env +
      Math.sin(2 * Math.PI * 1960 * t) * 0.12 * env;
  }
  writeWav(path.join(outDir, 'tick.wav'), sampleRate, samples);
}

// Soft whoosh for transitions / reveals
{
  const n = Math.floor(0.32 * sampleRate);
  const samples = new Float32Array(n);
  let noise = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    noise = noise * 0.9 + (Math.random() * 2 - 1) * 0.1;
    const env = Math.sin((Math.PI * i) / n) ** 1.35;
    const pitch = 320 + t * 1400;
    samples[i] =
      noise * 0.48 * env + Math.sin(2 * Math.PI * pitch * t) * 0.1 * env;
  }
  writeWav(path.join(outDir, 'whoosh.wav'), sampleRate, samples);
}

// Pop / switch / scene enter
{
  const n = Math.floor(0.16 * sampleRate);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 32);
    samples[i] =
      Math.sin(2 * Math.PI * 240 * t) * 0.48 * env +
      Math.sin(2 * Math.PI * 480 * t) * 0.22 * env;
  }
  writeWav(path.join(outDir, 'pop.wav'), sampleRate, samples);
}

// Soft ding for answer / bulb reveal
{
  const n = Math.floor(0.5 * sampleRate);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 5.2);
    samples[i] =
      Math.sin(2 * Math.PI * 698 * t) * 0.38 * env +
      Math.sin(2 * Math.PI * 1047 * t) * 0.2 * env +
      Math.sin(2 * Math.PI * 1396 * t) * 0.09 * env;
  }
  writeWav(path.join(outDir, 'ding.wav'), sampleRate, samples);
}

console.log('SFX written to', outDir);
