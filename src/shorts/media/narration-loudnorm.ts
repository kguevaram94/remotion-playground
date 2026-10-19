import {existsSync, unlinkSync} from 'node:fs';
import path from 'node:path';
import {loudnormAudio} from './ffmpeg';

/**
 * Ensure a loudnorm copy of narration exists for non-mock audio.
 * Returns the path to use in the Remotion render (loudnorm when available).
 */
export const ensureNarrationLoudnorm = (options: {
  jobDir: string;
  narrationAudio: string;
  isTestAudio: boolean;
}): {usedPath: string; loudnormPath: string | null; applied: boolean} => {
  const {jobDir, narrationAudio, isTestAudio} = options;
  if (!existsSync(narrationAudio)) {
    return {usedPath: narrationAudio, loudnormPath: null, applied: false};
  }

  if (isTestAudio) {
    const stale = path.join(jobDir, 'narration-loudnorm.wav');
    if (existsSync(stale)) {
      try {
        unlinkSync(stale);
      } catch {
        // ignore
      }
    }
    return {usedPath: narrationAudio, loudnormPath: null, applied: false};
  }

  const loudnormPath = path.join(jobDir, 'narration-loudnorm.wav');
  if (loudnormAudio(narrationAudio, loudnormPath) && existsSync(loudnormPath)) {
    return {usedPath: loudnormPath, loudnormPath, applied: true};
  }

  return {usedPath: narrationAudio, loudnormPath: null, applied: false};
};

/** Prefer loudnorm WAV for render when present and not test audio. */
export const resolveNarrationForRender = (options: {
  narrationAudio?: string;
  narrationLoudnorm?: string;
  isTestAudio: boolean;
}): string | null => {
  const {narrationAudio, narrationLoudnorm, isTestAudio} = options;
  if (
    !isTestAudio &&
    narrationLoudnorm &&
    existsSync(narrationLoudnorm)
  ) {
    return narrationLoudnorm;
  }
  if (narrationAudio && existsSync(narrationAudio)) {
    return narrationAudio;
  }
  return null;
};
