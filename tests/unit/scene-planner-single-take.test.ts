import {describe, expect, it} from 'vitest';
import {planScenes} from '../../src/shorts/ai/scene-planner';
import type {VideoScript} from '../../src/shorts/domain/script.schema';
import {allocateSceneTimings} from '../../src/shorts/utils/timing';
import {SINGLE_TAKE_DURATION_TOLERANCE_SEC} from '../../src/shorts/voice/single-take';

/** Pilot authorship: 4 + 5.566… + 0.033… = 9.6 s → 288 frames @ 30 fps. */
const pilotScenes = () =>
  [
    {
      id: 'saludo',
      type: 'hook' as const,
      durationSeconds: 4,
      narration: 'Buenos días. ¿Qué tal estás?',
      onScreenText: 'BUENOS DÍAS',
      subtitleText: 'Buenos días',
      transition: 'fade' as const,
      visual: {
        template: 'text' as const,
        headline: 'Buenos días',
        body: 'saludo',
      },
    },
    {
      id: 'explicacion',
      type: 'reveal' as const,
      durationSeconds: 5.566666666666666,
      narration: 'Vamos a revisar el resultado con calma.',
      onScreenText: 'REVISAR',
      subtitleText: 'Revisar con calma',
      transition: 'fade' as const,
      visual: {
        template: 'text' as const,
        headline: 'Revisar',
        body: 'explicación',
      },
    },
    {
      id: 'cierre-schema',
      type: 'outro' as const,
      durationSeconds: 0.03333333333333333,
      narration: '',
      onScreenText: 'T-007B',
      subtitleText: '',
      transition: 'none' as const,
      visual: {
        template: 'text' as const,
        headline: 'T-007B',
        body: 'muda',
      },
    },
  ] satisfies VideoScript['scenes'];

const pilotScript = (): VideoScript =>
  ({
    id: 't007b-file-pilot',
    title: 'Piloto file',
    language: 'es',
    niche: 'logic',
    format: 'logic-puzzle',
    targetDurationSeconds: 9.6,
    aspectRatio: '9:16',
    fps: 30,
    resolution: {width: 1080, height: 1920},
    hook: 'Buenos días',
    narration: 'Buenos días. Vamos a revisar.',
    scenes: pilotScenes(),
    solution: {
      summary: 'piloto',
      explanation: 'piloto',
      validationStatus: 'partial',
    },
    callToAction: 'no publicar',
    sources: [],
    createdAt: '2026-10-22T10:05:00.000Z',
    schemaVersion: 1,
  }) as VideoScript;

describe('planScenes single-take (VOICE_PROVIDER=file)', () => {
  it('preserves 9.6s authorship and 288 frames @ 30fps (no stretch to 25)', () => {
    const planned = planScenes(pilotScript(), {
      targetDurationSeconds: 25,
      maxDurationSeconds: 45,
      narrationDurationSeconds: 9.6,
      voiceTimingMode: 'single-take',
    });

    const sum = planned.scenes.reduce((a, s) => a + s.durationSeconds, 0);
    expect(sum).toBeCloseTo(9.6, 10);
    expect(planned.scenes[0]!.durationSeconds).toBe(4);
    expect(planned.scenes[1]!.durationSeconds).toBeCloseTo(5.566666666666666, 10);
    expect(planned.scenes[2]!.durationSeconds).toBeCloseTo(0.03333333333333333, 10);
    expect(planned.scenes[2]!.narration).toBe('');

    const timed = allocateSceneTimings(planned.scenes, 30);
    expect(timed.map((t) => t.durationFrames)).toEqual([120, 167, 1]);
    expect(timed.reduce((a, t) => a + t.durationFrames, 0)).toBe(288);
    expect(planned.targetDurationSeconds).toBeCloseTo(9.6, 10);
  });

  it('preserves durations before WAV probe (planning_scenes) without config target', () => {
    const planned = planScenes(pilotScript(), {
      targetDurationSeconds: 25,
      maxDurationSeconds: 45,
      voiceTimingMode: 'single-take',
    });
    const sum = planned.scenes.reduce((a, s) => a + s.durationSeconds, 0);
    expect(sum).toBeCloseTo(9.6, 10);
  });

  it('errors when script sum and WAV differ beyond tolerance', () => {
    expect(() =>
      planScenes(pilotScript(), {
        targetDurationSeconds: 25,
        maxDurationSeconds: 45,
        narrationDurationSeconds: 9.6 + SINGLE_TAKE_DURATION_TOLERANCE_SEC + 0.01,
        voiceTimingMode: 'single-take',
      }),
    ).toThrow(/single-take/);
  });

  it('does not apply measured-segment mapping in single-take even if segments are passed', () => {
    const planned = planScenes(pilotScript(), {
      targetDurationSeconds: 25,
      maxDurationSeconds: 45,
      narrationDurationSeconds: 9.6,
      voiceTimingMode: 'single-take',
      voiceSegments: [
        {sceneId: 'saludo', durationSeconds: 4.8, pauseAfterSec: 0},
        {sceneId: 'explicacion', durationSeconds: 4.8, pauseAfterSec: 0},
      ],
    });
    expect(planned.scenes[0]!.durationSeconds).toBe(4);
    expect(planned.scenes[1]!.durationSeconds).toBeCloseTo(5.566666666666666, 10);
  });
});

describe('planScenes measured-segments (OpenAI / Chatterbox regression)', () => {
  it('still maps TTS segment durations (+ pauses) onto scenes', () => {
    const script = pilotScript();
    script.scenes = script.scenes.map((s) =>
      s.id === 'cierre-schema'
        ? s
        : {...s, durationSeconds: 2},
    );
    // Provide a mute-scene segment so coverage is complete (pre-existing rule).
    const planned = planScenes(script, {
      targetDurationSeconds: 25,
      maxDurationSeconds: 45,
      narrationDurationSeconds: 12,
      voiceSegments: [
        {sceneId: 'saludo', durationSeconds: 3.2, pauseAfterSec: 0.7},
        {sceneId: 'explicacion', durationSeconds: 4.1, pauseAfterSec: 0.7},
        {sceneId: 'cierre-schema', durationSeconds: 0.5, pauseAfterSec: 0},
      ],
    });
    expect(planned.scenes[0]!.durationSeconds).toBeCloseTo(3.9, 5);
    expect(planned.scenes[1]!.durationSeconds).toBeCloseTo(4.8, 5);
    expect(planned.scenes[2]!.durationSeconds).toBeCloseTo(0.7, 5); // minPerScene
  });

  it('still redistributes toward config target when no voice segments', () => {
    const planned = planScenes(pilotScript(), {
      targetDurationSeconds: 25,
      maxDurationSeconds: 45,
    });
    const sum = planned.scenes.reduce((a, s) => a + s.durationSeconds, 0);
    expect(sum).toBeCloseTo(25, 1);
  });
});
