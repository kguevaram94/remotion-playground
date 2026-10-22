import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, writeFileSync, mkdirSync, unlinkSync} from 'node:fs';
import path from 'node:path';
import type {AppConfig} from '../config/env';
import {readWavDurationSeconds} from '../media/wav-probe';
import {estimateNarrationSeconds} from '../utils/timing';
import {ChatterboxVoiceProvider} from './chatterbox';
import {DEFAULT_VOICE_ES_ES, resolveVoiceAlias} from './voices-es';

export type VoiceResult = {
  audioPath: string;
  durationSeconds: number;
  sampleRate: number;
  format: string;
  provider: string;
  model: string;
  isTestAudio: boolean;
  cues?: Array<{text: string; startMs: number; endMs: number}>;
};

export type VoiceContext = {
  jobId?: string;
};

export interface VoiceProvider {
  readonly name: string;
  synthesize(
    text: string,
    outputPath: string,
    ctx?: VoiceContext,
  ): Promise<VoiceResult>;
}

/** Write a mono PCM WAV tone — explicitly marked as test audio. */
export const writeTestWav = (
  outputPath: string,
  durationSeconds: number,
  options?: {frequency?: number; volume?: number},
): {durationSeconds: number; sampleRate: number} => {
  const sampleRate = 22050;
  const frequency = options?.frequency ?? 440;
  const volume = options?.volume ?? 0.08;
  const numSamples = Math.max(1, Math.floor(durationSeconds * sampleRate));
  bufferWriteWav(outputPath, sampleRate, numSamples, (i) => {
    const t = i / sampleRate;
    const burst = Math.floor(t * 0.5) % 2 === 0 ? 1 : 0;
    return Math.sin(2 * Math.PI * frequency * t) * volume * burst;
  });
  return {durationSeconds: numSamples / sampleRate, sampleRate};
};

const bufferWriteWav = (
  outputPath: string,
  sampleRate: number,
  numSamples: number,
  sampleAt: (i: number) => number,
) => {
  const dataSize = numSamples * 2;
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
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, sampleAt(i))) * 32767;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }
  mkdirSync(path.dirname(outputPath), {recursive: true});
  writeFileSync(outputPath, buffer);
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

export class MockVoiceProvider implements VoiceProvider {
  readonly name = 'mock';

  async synthesize(text: string, outputPath: string): Promise<VoiceResult> {
    const durationSeconds = estimateNarrationSeconds(text);
    const {sampleRate} = writeTestWav(outputPath, durationSeconds);
    return {
      audioPath: outputPath,
      durationSeconds,
      sampleRate,
      format: 'wav',
      provider: this.name,
      model: 'mock-tone',
      isTestAudio: true,
      cues: buildWordCues(text, durationSeconds),
    };
  }
}

/** Pick a Spanish macOS voice available on the machine. Prefer neural es_ES. */
export const resolveMacOsVoice = (preferred?: string): string => {
  if (preferred && preferred !== 'mock-tone') {
    return resolveVoiceAlias(preferred);
  }
  const listed = spawnSync('say', ['-v', '?'], {encoding: 'utf8'});
  const lines = (listed.stdout || '').split('\n');
  // Neural first — classic Mónica often sounds robotic
  const priorities = [
    /^Flo \(Español \(España\)\)/,
    /^Sandy \(Español \(España\)\)/,
    /^Shelley \(Español \(España\)\)/,
    /^Eddy \(Español \(España\)\)/,
    /^Reed \(Español \(España\)\)/,
    /^Rocko \(Español \(España\)\)/,
    /^Paulina\b/,
    /^Mónica\b/i,
    /^Monica\b/i,
  ];
  for (const re of priorities) {
    const hit = lines.find((l) => re.test(l.trim()));
    if (hit) {
      const name = hit.trim().split(/\s{2,}|\tes_/)[0]?.trim();
      if (name) return name;
    }
  }
  for (const line of lines) {
    if (/\bes_ES\b/.test(line)) {
      const name = line.trim().split(/\s{2,}/)[0]?.trim();
      if (name) return name;
    }
  }
  return DEFAULT_VOICE_ES_ES;
};

const convertAiffToWav = (aiffPath: string, wavPath: string): void => {
  // Prefer afconvert (built into macOS)
  if (existsSync('/usr/bin/afconvert')) {
    const conv = spawnSync(
      'afconvert',
      ['-f', 'WAVE', '-d', 'LEI16@22050', aiffPath, wavPath],
      {encoding: 'utf8'},
    );
    if (conv.status === 0 && existsSync(wavPath)) return;
  }

  const ffmpeg = spawnSync('which', ['ffmpeg'], {encoding: 'utf8'});
  if (ffmpeg.status === 0) {
    const conv = spawnSync(
      'ffmpeg',
      ['-y', '-i', aiffPath, '-acodec', 'pcm_s16le', '-ar', '22050', wavPath],
      {encoding: 'utf8'},
    );
    if (conv.status === 0 && existsSync(wavPath)) return;
  }

  throw new Error(
    'No se pudo convertir AIFF→WAV. Se necesita afconvert (macOS) o ffmpeg.',
  );
};

export class MacOsSayVoiceProvider implements VoiceProvider {
  readonly name = 'macos-say';

  constructor(private readonly voice?: string) {}

  async synthesize(text: string, outputPath: string): Promise<VoiceResult> {
    const voice = resolveMacOsVoice(this.voice);
    mkdirSync(path.dirname(outputPath), {recursive: true});
    const aiffPath = outputPath.replace(/\.[^.]+$/, '') + '.aiff';

    const say = spawnSync('say', ['-v', voice, '-o', aiffPath, text], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    if (say.status !== 0 || !existsSync(aiffPath)) {
      throw new Error(
        `macos say falló (voz=${voice}): ${say.stderr || say.stdout || 'sin salida'}`,
      );
    }

    const wavPath = outputPath.endsWith('.wav')
      ? outputPath
      : outputPath.replace(/\.[^.]+$/, '') + '.wav';
    convertAiffToWav(aiffPath, wavPath);
    try {
      unlinkSync(aiffPath);
    } catch {
      // ignore
    }

    const durationSeconds =
      readWavDurationSeconds(wavPath) ?? estimateNarrationSeconds(text);

    return {
      audioPath: wavPath,
      durationSeconds,
      sampleRate: 22050,
      format: 'wav',
      provider: this.name,
      model: voice,
      isTestAudio: false,
      cues: buildWordCues(text, durationSeconds),
    };
  }
}

export class OpenAiTtsVoiceProvider implements VoiceProvider {
  readonly name = 'openai-tts';

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly voice: string,
    private readonly instructions: string | undefined,
    private readonly speed: number,
    private readonly timeoutMs: number,
  ) {}

  async synthesize(text: string, outputPath: string): Promise<VoiceResult> {
    const {synthesizeOpenAiTts} = await import('./openai-tts');
    return synthesizeOpenAiTts(text, outputPath, {
      apiKey: this.apiKey,
      model: this.model,
      voice: this.voice,
      instructions: this.instructions,
      speed: this.speed,
      timeoutMs: this.timeoutMs,
    });
  }
}

export class ElevenLabsVoiceProvider implements VoiceProvider {
  readonly name = 'elevenlabs';

  constructor(
    private readonly apiKey: string,
    private readonly voiceId: string,
    private readonly modelId: string,
    private readonly timeoutMs: number,
  ) {}

  async synthesize(text: string, outputPath: string): Promise<VoiceResult> {
    const {synthesizeElevenLabs} = await import('./elevenlabs');
    return synthesizeElevenLabs(text, outputPath, {
      apiKey: this.apiKey,
      voiceId: this.voiceId,
      modelId: this.modelId,
      timeoutMs: this.timeoutMs,
    });
  }
}

export class FileVoiceProvider implements VoiceProvider {
  readonly name = 'file';

  constructor(private readonly voiceFile?: string) {}

  async synthesize(
    text: string,
    outputPath: string,
    ctx?: VoiceContext,
  ): Promise<VoiceResult> {
    const {resolveCustomNarrationPath, synthesizeFromFile} = await import(
      './file-provider'
    );
    const source = resolveCustomNarrationPath(
      ctx?.jobId || 'unknown',
      this.voiceFile,
    );
    if (!source) {
      throw new Error(
        'VOICE_PROVIDER=file: coloca un WAV PCM en output/<id>/narration.custom.wav ' +
          'o define VOICE_FILE=ruta/a/narracion.wav (ver docs/voice.md)',
      );
    }
    return synthesizeFromFile(text, outputPath, source);
  }
}

export const createVoiceProvider = (config: AppConfig): VoiceProvider => {
  switch (config.voiceProvider) {
    case 'macos-say':
      return new MacOsSayVoiceProvider(
        config.voiceModel && config.voiceModel !== 'mock-tone'
          ? resolveVoiceAlias(config.voiceModel)
          : undefined,
      );
    case 'openai-tts':
      if (!config.voiceApiKey) {
        throw new Error(
          'Falta OPENAI_API_KEY o VOICE_API_KEY para openai-tts (entonación natural).',
        );
      }
      return new OpenAiTtsVoiceProvider(
        config.voiceApiKey,
        config.voiceTtsModel || 'gpt-4o-mini-tts',
        config.voiceName || 'coral',
        config.voiceInstructions,
        config.voiceSpeed,
        config.requestTimeoutMs,
      );
    case 'elevenlabs':
      if (!config.elevenLabsApiKey) {
        throw new Error('Falta ELEVENLABS_API_KEY para elevenlabs.');
      }
      if (!config.elevenLabsVoiceId) {
        throw new Error(
          'Falta ELEVENLABS_VOICE_ID. Clona tu voz con: npm run short:clone-voice -- --sample data/voices/me.wav',
        );
      }
      return new ElevenLabsVoiceProvider(
        config.elevenLabsApiKey,
        config.elevenLabsVoiceId,
        config.elevenLabsModel || 'eleven_multilingual_v2',
        config.requestTimeoutMs,
      );
    case 'file':
      return new FileVoiceProvider(config.voiceFile);
    case 'chatterbox':
      // Missing CHATTERBOX_* → throw inside constructor. Never silent mock fallback.
      return new ChatterboxVoiceProvider({
        pythonPath: config.chatterboxPython ?? '',
        scriptPath: config.chatterboxScript ?? '',
        ckptDir: config.chatterboxCkptDir ?? '',
        refWav: config.chatterboxRefWav ?? '',
        device: config.chatterboxDevice,
        timeoutMs: config.chatterboxTimeoutMs,
        languageId: config.chatterboxLanguageId,
        exaggeration: config.chatterboxExaggeration,
        cfgWeight: config.chatterboxCfgWeight,
        temperature: config.chatterboxTemperature,
      });
    case 'mock':
      return new MockVoiceProvider();
    default:
      return new MockVoiceProvider();
  }
};

export const narrationCacheKey = (
  text: string,
  provider: string,
  model: string,
) => createHash('sha256').update(`${provider}:${model}:${text}`).digest('hex');
