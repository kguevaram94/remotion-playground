/**
 * VOICE_PROVIDER=file single-take contract (T-CHATTERBOX-007C-SYNC · opción A).
 *
 * One WAV = one take. Scene durations come from the script (authorship),
 * not from invented equal-split voice segments. Uniform word cues are
 * approximate layout aids — not phonetic alignment.
 */

/** Max |Σ scene durations − probed WAV duration| allowed for single-take. */
export const SINGLE_TAKE_DURATION_TOLERANCE_SEC = 0.05;

/**
 * Bumped into the file-provider narration cache identity so jobs that still
 * carry equal-split `voice-meta.segments` are not reused as single-take.
 */
export const FILE_SINGLE_TAKE_CACHE_TOKEN = 'file:single-take-v1';

export type VoiceTimingMode = 'measured-segments' | 'single-take';

export type SingleTakeVoiceMeta = {
  durationSeconds: number;
  provider: string;
  model: string;
  isTestAudio: boolean;
  cues: Array<{text: string; startMs: number; endMs: number}>;
  format: 'wav';
  /** Explicit single-take mode — consumers must not invent per-scene speech timings. */
  timingMode: 'single-take';
  /** Word cues are equispaced over the take; not forced-alignment. */
  cuesKind: 'uniform';
};

export type VoiceMetaLike = {
  provider?: string;
  timingMode?: string;
  segments?: unknown;
  cuesKind?: string;
};

/** True when meta (or job config) declares file single-take — including legacy file meta without timingMode. */
export const isSingleTakeVoiceMeta = (
  meta: VoiceMetaLike | null | undefined,
  voiceProvider?: string,
): boolean => {
  if (meta?.timingMode === 'single-take') return true;
  if (meta?.provider === 'file') return true;
  if (voiceProvider === 'file') return true;
  return false;
};

export const sumSceneDurations = (
  scenes: Array<{durationSeconds: number}>,
): number => scenes.reduce((a, s) => a + s.durationSeconds, 0);

/**
 * Fail closed when authorship durations and the probed WAV disagree.
 * Does not stretch or compress scenes to hide the gap.
 */
export const assertSingleTakeDurationMatch = (
  scriptDurationSeconds: number,
  wavDurationSeconds: number,
  toleranceSec: number = SINGLE_TAKE_DURATION_TOLERANCE_SEC,
): void => {
  const delta = Math.abs(scriptDurationSeconds - wavDurationSeconds);
  if (delta <= toleranceSec) return;
  throw new Error(
    `VOICE_PROVIDER=file (single-take): la suma de escenas (${scriptDurationSeconds.toFixed(6)}s) ` +
      `no coincide con la duración del WAV (${wavDurationSeconds.toFixed(6)}s); ` +
      `|Δ|=${delta.toFixed(6)}s > tolerancia ${toleranceSec}s. ` +
      `Ajusta durationSeconds del guion o el audio; no se redistribuye automáticamente.`,
  );
};

export const buildSingleTakeVoiceMeta = (input: {
  durationSeconds: number;
  provider: string;
  model: string;
  isTestAudio: boolean;
  cues: Array<{text: string; startMs: number; endMs: number}>;
}): SingleTakeVoiceMeta => ({
  durationSeconds: input.durationSeconds,
  provider: input.provider,
  model: input.model,
  isTestAudio: input.isTestAudio,
  cues: input.cues,
  format: 'wav',
  timingMode: 'single-take',
  cuesKind: 'uniform',
});
