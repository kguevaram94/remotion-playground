import {describe, expect, it} from 'vitest';
import {
  isStrictlyIncreasing,
  planSceneFade,
} from '../../src/shorts/remotion/components/scene-fade-plan';
import {secondsToFrames} from '../../src/shorts/utils/timing';

const assertPlanSafe = (
  durationInFrames: number,
  fadeInFrames = 8,
  fadeOutFrames = 8,
) => {
  const plan = planSceneFade(durationInFrames, fadeInFrames, fadeOutFrames);
  if (plan.mode === 'constant') {
    expect(plan.opacity).toBe(1);
    return plan;
  }
  expect(plan.inputRange.length).toBe(plan.outputRange.length);
  expect(plan.inputRange.length).toBeGreaterThanOrEqual(2);
  expect(isStrictlyIncreasing(plan.inputRange)).toBe(true);
  expect(plan.inputRange[0]).toBe(0);
  expect(plan.inputRange[plan.inputRange.length - 1]).toBe(durationInFrames);
  return plan;
};

describe('planSceneFade', () => {
  it.each([1, 2, 8, 9, 16])(
    'produces a Remotion-safe plan for durationInFrames=%s (default fades)',
    (durationInFrames) => {
      assertPlanSafe(durationInFrames);
    },
  );

  it('uses constant opacity for durationInFrames <= 1 (no interpolate range)', () => {
    expect(planSceneFade(1)).toEqual({mode: 'constant', opacity: 1});
    expect(planSceneFade(0)).toEqual({mode: 'constant', opacity: 1});
  });

  it('covers the pilot outro: 0.033…s @ 30fps → 1 frame → constant', () => {
    const frames = secondsToFrames(0.03333333333333333, 30);
    expect(frames).toBe(1);
    const plan = planSceneFade(frames);
    expect(plan).toEqual({mode: 'constant', opacity: 1});
  });

  it('preserves classic 4-point fades when both fit with a hold', () => {
    const plan = assertPlanSafe(100);
    expect(plan.mode).toBe('interpolate');
    if (plan.mode === 'interpolate') {
      expect(plan.inputRange).toEqual([0, 8, 92, 100]);
      expect(plan.outputRange).toEqual([0, 1, 1, 0]);
    }
  });

  it('preserves classic ranges when fadeIn+fadeOut < duration (e.g. 17)', () => {
    const plan = assertPlanSafe(17);
    expect(plan.mode).toBe('interpolate');
    if (plan.mode === 'interpolate') {
      expect(plan.inputRange).toEqual([0, 8, 9, 17]);
      expect(plan.outputRange).toEqual([0, 1, 1, 0]);
    }
  });

  it('shrinks fades instead of emitting the legacy broken [0,8,9,1]', () => {
    // Legacy SceneFade formula for duration=1: [0,8,9,1]
    expect(isStrictlyIncreasing([0, 8, 9, 1])).toBe(false);
    const plan = planSceneFade(1, 8, 8);
    expect(plan.mode).toBe('constant');
  });
});
