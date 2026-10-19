import type {VideoScript} from '../domain/script.schema';
import {durationsFromVoiceSegments, redistributeToFit} from '../utils/timing';

export type VoiceSegmentTiming = {
  sceneId: string;
  durationSeconds: number;
  pauseAfterSec: number;
};

/**
 * Ensure scene timings fit narration estimates / target duration.
 * Prefer per-scene voice segment lengths when available (exact A/V sync).
 */
export const planScenes = (
  script: VideoScript,
  options: {
    targetDurationSeconds: number;
    maxDurationSeconds: number;
    narrationDurationSeconds?: number;
    voiceSegments?: VoiceSegmentTiming[];
  },
): VideoScript => {
  const scenes = script.scenes.map((s) => ({...s}));

  const fromVoice = options.voiceSegments
    ? durationsFromVoiceSegments(
        scenes.map((s) => s.id),
        options.voiceSegments,
      )
    : null;

  if (fromVoice) {
    scenes.forEach((s, i) => {
      s.durationSeconds = fromVoice[i]!;
    });
  } else {
    const current = scenes.reduce((a, s) => a + s.durationSeconds, 0);
    let target = options.targetDurationSeconds;
    if (options.narrationDurationSeconds) {
      // Sync to real audio (sentence/paragraph pauses can exceed soft max).
      target = Math.max(
        options.narrationDurationSeconds + 0.4,
        Math.min(options.maxDurationSeconds, options.targetDurationSeconds),
      );
    }

    if (Math.abs(current - target) > 0.3) {
      const next = redistributeToFit(
        scenes.map((s) => s.durationSeconds),
        target,
        0.7,
      );
      scenes.forEach((s, i) => {
        s.durationSeconds = next[i] ?? s.durationSeconds;
      });
    }
  }

  // Countdown visual seconds follow the actual scene length
  for (const scene of scenes) {
    if (scene.type === 'countdown' && scene.visual.template === 'countdown') {
      const secs = Math.max(1, Math.round(scene.durationSeconds));
      scene.visual = {...scene.visual, seconds: secs};
      scene.durationSeconds = Math.max(scene.durationSeconds, secs);
    }
  }

  const narration = scenes.map((s) => s.narration).join(' ');

  return {
    ...script,
    scenes,
    narration,
    targetDurationSeconds: scenes.reduce((a, s) => a + s.durationSeconds, 0),
  };
};
