import {describe, expect, it} from 'vitest';
import {
  allocateSceneTimings,
  durationsFromVoiceSegments,
  redistributeToFit,
  secondsToFrames,
} from '../../src/shorts/utils/timing';

describe('timing', () => {
  it('converts seconds to frames with minimum 1', () => {
    expect(secondsToFrames(1, 30)).toBe(30);
    expect(secondsToFrames(0.01, 30)).toBe(1);
  });

  it('allocates contiguous scene timings', () => {
    const timed = allocateSceneTimings(
      [
        {id: 'a', durationSeconds: 1},
        {id: 'b', durationSeconds: 2},
      ],
      30,
    );
    expect(timed[0]!.startFrame).toBe(0);
    expect(timed[0]!.durationFrames).toBe(30);
    expect(timed[1]!.startFrame).toBe(30);
    expect(timed[1]!.durationFrames).toBe(60);
  });

  it('redistributes durations to a target total', () => {
    const next = redistributeToFit([2, 2, 2], 9, 0.5);
    const sum = next.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(9, 5);
    expect(next.every((d) => d >= 0.5)).toBe(true);
  });

  it('maps voice segment lengths onto scene durations', () => {
    const next = durationsFromVoiceSegments(
      ['hook', 'rules', 'think'],
      [
        {sceneId: 'hook', durationSeconds: 4, pauseAfterSec: 0.7},
        {sceneId: 'rules', durationSeconds: 5, pauseAfterSec: 0.7},
        {sceneId: 'think', durationSeconds: 3, pauseAfterSec: 0},
      ],
    );
    expect(next).toEqual([4.7, 5.7, 3]);
  });
});
