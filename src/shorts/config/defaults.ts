export const SCHEMA_VERSION = 1;

export const DEFAULTS = {
  language: 'es',
  niche: 'puzzles',
  targetDurationSeconds: 25,
  maxDurationSeconds: 45,
  minDurationSeconds: 12,
  fps: 30,
  width: 1080,
  height: 1920,
  aspectRatio: '9:16' as const,
  outputDir: 'output',
  maxRetries: 2,
  requestTimeoutMs: 60_000,
  previewScale: 0.5,
  humanReviewPolicy: 'block_unverified' as const,
  aiProvider: 'template' as const,
  aiModel: 'template-v1',
  // On macOS default to system TTS; elsewhere keep explicit mock tones.
  voiceProvider: (process.platform === 'darwin' ? 'macos-say' : 'mock') as
    | 'macos-say'
    | 'mock',
  // Neural es_ES (Flo) — less robotic than classic Mónica
  voiceModel:
    process.platform === 'darwin' ? 'Flo (Español (España))' : 'mock-tone',
};

export type HumanReviewPolicy =
  | 'block_unverified'
  | 'warn_and_continue'
  | 'require_review';
