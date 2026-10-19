import {writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {estimateNarrationSeconds} from '../utils/timing';
import type {VoiceResult} from './provider';

/** OpenAI TTS voices (gpt-4o-mini-tts / tts-1-hd). */
export const OPENAI_TTS_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'cedar',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
] as const;

export type OpenAiTtsVoice = (typeof OPENAI_TTS_VOICES)[number];

export const DEFAULT_OPENAI_VOICE: OpenAiTtsVoice = 'coral';

export const DEFAULT_OPENAI_TTS_INSTRUCTIONS = [
  'IMPORTANT: Speak ONLY Spanish from Spain (castellano). Never use English.',
  'Native Madrid accent — not English-accented Spanish.',
  'Entonación natural y expresiva, como un presentador de YouTube Shorts.',
  'Ritmo RÁPIDO y dinámico: habla con energía, sin arrastrar. Pausas mínimas.',
  'Varía el ritmo: ganchos más vivos, claridad al revelar. No suenes monocorde.',
].join(' ');

/** OpenAI TTS speed range: 0.25–4.0 (default API = 1.0). Shorts prefer >1. */
export const DEFAULT_OPENAI_TTS_SPEED = 1.2;

const readWavDurationSeconds = (filePath: string): number | null => {
  try {
    const {readFileSync, statSync} = require('node:fs') as typeof import('node:fs');
    const buf = readFileSync(filePath);
    if (buf.toString('ascii', 0, 4) !== 'RIFF') return null;
    const sampleRate = buf.readUInt32LE(24) || 24000;
    const bitsPerSample = buf.readUInt16LE(34) || 16;
    const channels = buf.readUInt16LE(22) || 1;
    const bytesPerSample = (bitsPerSample / 8) * channels;
    if (bytesPerSample <= 0 || sampleRate <= 0) return null;

    let offset = 12;
    while (offset < buf.length - 8) {
      const id = buf.toString('ascii', offset, offset + 4);
      const size = buf.readUInt32LE(offset + 4);
      if (id === 'data') {
        // OpenAI often streams WAV with size=0xFFFFFFFF — fall back to file size
        const dataBytes =
          size === 0xffffffff ? Math.max(0, statSync(filePath).size - (offset + 8)) : size;
        return dataBytes / bytesPerSample / sampleRate;
      }
      offset += 8 + (size === 0xffffffff ? 0 : size);
      if (size === 0xffffffff) break;
    }
    return null;
  } catch {
    return null;
  }
};

const buildWordCues = (text: string, durationSeconds: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const msEach = (durationSeconds * 1000) / Math.max(1, words.length);
  let cursor = 0;
  return words.map((w) => {
    const startMs = cursor;
    const endMs = cursor + msEach;
    cursor = endMs;
    return {text: w, startMs, endMs};
  });
};

export type OpenAiTtsOptions = {
  apiKey: string;
  /** Model id, e.g. gpt-4o-mini-tts or tts-1-hd */
  model: string;
  /** Speaker voice name (coral, nova, …) — NOT the model id */
  voice: string;
  instructions?: string;
  /** Playback speed 0.25–4.0 */
  speed?: number;
  timeoutMs: number;
};

export const synthesizeOpenAiTts = async (
  text: string,
  outputPath: string,
  options: OpenAiTtsOptions,
): Promise<VoiceResult> => {
  const voice = (OPENAI_TTS_VOICES as readonly string[]).includes(options.voice)
    ? options.voice
    : DEFAULT_OPENAI_VOICE;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  mkdirSync(path.dirname(outputPath), {recursive: true});

  try {
    const speed = Math.min(
      4,
      Math.max(0.25, options.speed ?? DEFAULT_OPENAI_TTS_SPEED),
    );
    const body: Record<string, unknown> = {
      model: options.model,
      input: text,
      voice,
      response_format: 'wav',
      speed,
    };
    // instructions only supported on gpt-4o-mini-tts / gpt-4o-tts family
    if (/gpt-4o/i.test(options.model)) {
      body.instructions =
        options.instructions || DEFAULT_OPENAI_TTS_INSTRUCTIONS;
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI TTS HTTP ${response.status}: ${errText.slice(0, 400)}`);
    }

    const buf = Buffer.from(await response.arrayBuffer());
    writeFileSync(outputPath, buf);
    const durationSeconds =
      readWavDurationSeconds(outputPath) ?? estimateNarrationSeconds(text);

    return {
      audioPath: outputPath,
      durationSeconds,
      sampleRate: 24000,
      format: 'wav',
      provider: 'openai-tts',
      model: `${options.model}/${voice}`,
      isTestAudio: false,
      cues: buildWordCues(text, durationSeconds),
    };
  } finally {
    clearTimeout(timer);
  }
};
