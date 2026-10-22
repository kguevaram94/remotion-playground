import type {VideoScript} from '../domain/script.schema';
import {durationsFromVoiceSegments, redistributeToFit} from '../utils/timing';
import {
  assertSingleTakeDurationMatch,
  sumSceneDurations,
  type VoiceTimingMode,
} from '../voice/single-take';

export type {VoiceTimingMode};

export type VoiceSegmentTiming = {
  sceneId: string;
  durationSeconds: number;
  pauseAfterSec: number;
};

/**
 * Ensure scene timings fit narration estimates / target duration.
 * Prefer per-scene voice segment lengths when available (exact A/V sync).
 *
 * `voiceTimingMode: 'single-take'` (VOICE_PROVIDER=file): keep script scene
 * durations; optionally verify Σ against the probed WAV; never redistribute
 * to SHORTS_TARGET_DURATION.
 */
export const planScenes = (
  script: VideoScript,
  options: {
    targetDurationSeconds: number;
    maxDurationSeconds: number;
    narrationDurationSeconds?: number;
    voiceSegments?: VoiceSegmentTiming[];
    voiceTimingMode?: VoiceTimingMode;
  },
): VideoScript => {
  const scenes = script.scenes.map((s) => ({...s}));

  if (options.voiceTimingMode === 'single-take') {
    const scriptSum = sumSceneDurations(scenes);
    if (typeof options.narrationDurationSeconds === 'number') {
      assertSingleTakeDurationMatch(
        scriptSum,
        options.narrationDurationSeconds,
      );
    }

    for (const scene of scenes) {
      if (scene.type === 'countdown' && scene.visual.template === 'countdown') {
        const secs = Math.max(1, Math.round(scene.durationSeconds));
        scene.visual = {...scene.visual, seconds: secs};
        // Do not inflate durationSeconds — authorship must stay aligned to WAV.
      }
    }

    const narration = scenes.map((s) => s.narration).join(' ');
    return {
      ...script,
      scenes,
      narration,
      targetDurationSeconds: sumSceneDurations(scenes),
    };
  }

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
