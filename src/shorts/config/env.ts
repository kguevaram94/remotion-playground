import {config as loadDotenv} from 'dotenv';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {DEFAULTS, type HumanReviewPolicy} from './defaults';

loadDotenv();

const loadVoiceInstructions = (): string | undefined => {
  const fromEnv = process.env.VOICE_INSTRUCTIONS?.trim();
  if (fromEnv) return fromEnv;
  const file = process.env.VOICE_INSTRUCTIONS_FILE?.trim();
  if (!file) return undefined;
  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  if (!existsSync(abs)) {
    throw new Error(`VOICE_INSTRUCTIONS_FILE no existe: ${abs}`);
  }
  return readFileSync(abs, 'utf8').trim();
};

export type VoiceProviderName =
  | 'mock'
  | 'macos-say'
  | 'openai-tts'
  | 'elevenlabs'
  | 'file'
  | 'chatterbox';

export type ChatterboxDeviceName = 'auto' | 'mps' | 'cpu' | 'cuda';

export type AppConfig = {
  language: string;
  targetDurationSeconds: number;
  maxDurationSeconds: number;
  minDurationSeconds: number;
  fps: number;
  width: number;
  height: number;
  outputDir: string;
  maxRetries: number;
  requestTimeoutMs: number;
  previewScale: number;
  humanReviewPolicy: HumanReviewPolicy;
  aiProvider: 'template' | 'openai' | 'openai-compatible';
  aiModel: string;
  aiBaseUrl?: string;
  aiApiKey?: string;
  voiceProvider: VoiceProviderName;
  /** macOS say name, or openai voice label fallback */
  voiceModel: string;
  /** OpenAI speaker: coral, nova, alloy… */
  voiceName?: string;
  /** OpenAI TTS model id */
  voiceTtsModel?: string;
  /** OpenAI TTS speed 0.25–4 (default 1.2 for Shorts) */
  voiceSpeed: number;
  voiceInstructions?: string;
  voiceApiKey?: string;
  voiceFile?: string;
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
  elevenLabsModel?: string;
  openAiApiKey?: string;
  /** Local Python interpreter for Chatterbox CLI (required when provider=chatterbox). */
  chatterboxPython?: string;
  /** Path to tools/chatterbox/synthesize.py (default relative to cwd). */
  chatterboxScript: string;
  /** Local es-es checkpoint directory (required when provider=chatterbox). */
  chatterboxCkptDir?: string;
  /** Local reference WAV path (required when provider=chatterbox; never a personal default). */
  chatterboxRefWav?: string;
  /** Device passed to CLI; mps/cuda fail if unavailable (no silent CPU fallback). */
  chatterboxDevice: ChatterboxDeviceName;
  /** Dedicated timeout (default 300000). Not SHORTS_REQUEST_TIMEOUT_MS. */
  chatterboxTimeoutMs: number;
  chatterboxLanguageId: string;
  chatterboxExaggeration: number;
  chatterboxCfgWeight: number;
  chatterboxTemperature: number;
};

const parseNumber = (value: string | undefined, fallback: number) => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const parsePolicy = (value: string | undefined): HumanReviewPolicy => {
  if (
    value === 'block_unverified' ||
    value === 'warn_and_continue' ||
    value === 'require_review'
  ) {
    return value;
  }
  return DEFAULTS.humanReviewPolicy;
};

const parseVoiceProvider = (value: string | undefined): VoiceProviderName => {
  if (
    value === 'mock' ||
    value === 'macos-say' ||
    value === 'openai-tts' ||
    value === 'elevenlabs' ||
    value === 'file' ||
    value === 'chatterbox'
  ) {
    return value;
  }
  return DEFAULTS.voiceProvider as VoiceProviderName;
};

const parseChatterboxDevice = (
  value: string | undefined,
): ChatterboxDeviceName => {
  if (
    value === 'auto' ||
    value === 'mps' ||
    value === 'cpu' ||
    value === 'cuda'
  ) {
    return value;
  }
  return 'auto';
};

/** Default CLI path relative to cwd — not a personal absolute path. */
export const DEFAULT_CHATTERBOX_SCRIPT = path.join(
  'tools',
  'chatterbox',
  'synthesize.py',
);

export const DEFAULT_CHATTERBOX_TIMEOUT_MS = 300_000;

export const loadConfig = (cwd = process.cwd()): AppConfig => {
  const openAiApiKey = process.env.OPENAI_API_KEY || undefined;
  const aiProvider =
    (process.env.AI_PROVIDER as AppConfig['aiProvider'] | undefined) ||
    (openAiApiKey ? 'openai' : DEFAULTS.aiProvider);

  const voiceProvider = parseVoiceProvider(process.env.VOICE_PROVIDER);

  const scriptEnv = process.env.CHATTERBOX_SCRIPT?.trim();
  const chatterboxScript = scriptEnv
    ? path.isAbsolute(scriptEnv)
      ? scriptEnv
      : path.resolve(cwd, scriptEnv)
    : path.resolve(cwd, DEFAULT_CHATTERBOX_SCRIPT);

  const config: AppConfig = {
    language: process.env.SHORTS_LANGUAGE || DEFAULTS.language,
    targetDurationSeconds: parseNumber(
      process.env.SHORTS_TARGET_DURATION,
      DEFAULTS.targetDurationSeconds,
    ),
    maxDurationSeconds: parseNumber(
      process.env.SHORTS_MAX_DURATION,
      DEFAULTS.maxDurationSeconds,
    ),
    minDurationSeconds: parseNumber(
      process.env.SHORTS_MIN_DURATION,
      DEFAULTS.minDurationSeconds,
    ),
    fps: parseNumber(process.env.SHORTS_FPS, DEFAULTS.fps),
    width: parseNumber(process.env.SHORTS_WIDTH, DEFAULTS.width),
    height: parseNumber(process.env.SHORTS_HEIGHT, DEFAULTS.height),
    outputDir: path.resolve(
      cwd,
      process.env.SHORTS_OUTPUT_DIR || DEFAULTS.outputDir,
    ),
    maxRetries: parseNumber(process.env.SHORTS_MAX_RETRIES, DEFAULTS.maxRetries),
    requestTimeoutMs: parseNumber(
      process.env.SHORTS_REQUEST_TIMEOUT_MS,
      DEFAULTS.requestTimeoutMs,
    ),
    previewScale: parseNumber(
      process.env.SHORTS_PREVIEW_SCALE,
      DEFAULTS.previewScale,
    ),
    humanReviewPolicy: parsePolicy(process.env.SHORTS_HUMAN_REVIEW_POLICY),
    aiProvider,
    aiModel: process.env.AI_MODEL || DEFAULTS.aiModel,
    aiBaseUrl: process.env.AI_BASE_URL,
    aiApiKey: process.env.AI_API_KEY || openAiApiKey,
    voiceProvider,
    voiceModel: process.env.VOICE_MODEL || DEFAULTS.voiceModel,
    voiceName: process.env.VOICE_NAME || 'coral',
    voiceTtsModel: process.env.VOICE_TTS_MODEL || 'gpt-4o-mini-tts',
    voiceSpeed: Math.min(
      4,
      Math.max(0.25, parseNumber(process.env.VOICE_SPEED, 1.2)),
    ),
    voiceInstructions: loadVoiceInstructions(),
    voiceApiKey: process.env.VOICE_API_KEY || openAiApiKey,
    voiceFile: process.env.VOICE_FILE,
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
    elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID,
    elevenLabsModel: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
    openAiApiKey,
    chatterboxPython: process.env.CHATTERBOX_PYTHON?.trim() || undefined,
    chatterboxScript,
    chatterboxCkptDir: process.env.CHATTERBOX_CKPT_DIR?.trim() || undefined,
    chatterboxRefWav: process.env.CHATTERBOX_REF_WAV?.trim() || undefined,
    chatterboxDevice: parseChatterboxDevice(process.env.CHATTERBOX_DEVICE),
    chatterboxTimeoutMs: parseNumber(
      process.env.CHATTERBOX_TIMEOUT_MS,
      DEFAULT_CHATTERBOX_TIMEOUT_MS,
    ),
    chatterboxLanguageId: process.env.CHATTERBOX_LANGUAGE_ID?.trim() || 'es',
    chatterboxExaggeration: parseNumber(
      process.env.CHATTERBOX_EXAGGERATION,
      0.5,
    ),
    chatterboxCfgWeight: parseNumber(process.env.CHATTERBOX_CFG_WEIGHT, 0.5),
    chatterboxTemperature: parseNumber(process.env.CHATTERBOX_TEMPERATURE, 0.8),
  };

  return config;
};

export const assertConfigForMode = (
  config: AppConfig,
  needsAi: boolean,
  needsVoice: boolean,
) => {
  if (
    needsAi &&
    (config.aiProvider === 'openai' ||
      config.aiProvider === 'openai-compatible') &&
    !config.aiApiKey
  ) {
    throw new Error(
      'Falta AI_API_KEY u OPENAI_API_KEY. Usa AI_PROVIDER=template para modo local sin API.',
    );
  }

  if (needsVoice && config.voiceProvider === 'openai-tts' && !config.voiceApiKey) {
    throw new Error(
      'Falta OPENAI_API_KEY para openai-tts. Alternativas: VOICE_PROVIDER=file (tu grabación) o elevenlabs.',
    );
  }

  if (
    needsVoice &&
    config.voiceProvider === 'elevenlabs' &&
    !config.elevenLabsApiKey
  ) {
    throw new Error('Falta ELEVENLABS_API_KEY.');
  }

  if (needsVoice && config.voiceProvider === 'chatterbox') {
    const missing: string[] = [];
    if (!config.chatterboxPython) missing.push('CHATTERBOX_PYTHON');
    if (!config.chatterboxCkptDir) missing.push('CHATTERBOX_CKPT_DIR');
    if (!config.chatterboxRefWav) missing.push('CHATTERBOX_REF_WAV');
    if (missing.length) {
      throw new Error(
        `VOICE_PROVIDER=chatterbox requiere: ${missing.join(', ')}. ` +
          'Rutas locales en .env (ver .env.example). No se degrada a mock.',
      );
    }
  }
};
