/**
 * Pure fade keyframe planner for SceneFade.
 * Guarantees Remotion-safe inputRange (strictly monotonically increasing)
 * or a constant opacity when a fade cannot fit.
 */

export type SceneFadePlan =
  | {mode: 'constant'; opacity: number}
  | {mode: 'interpolate'; inputRange: number[]; outputRange: number[]};

export const isStrictlyIncreasing = (values: readonly number[]): boolean => {
  for (let i = 1; i < values.length; i++) {
    if (!(values[i]! > values[i - 1]!)) return false;
  }
  return true;
};

/**
 * Build a fade plan that never yields a non-monotonic interpolate inputRange.
 *
 * Normal durations (fadeIn + fadeOut < duration) keep the classic hold plateau:
 * [0, fadeIn, duration - fadeOut, duration] → [0, 1, 1, 0].
 * Shorter clips shrink or drop fades; duration ≤ 1 uses constant opacity.
 */
export const planSceneFade = (
  durationInFrames: number,
  fadeInFrames = 8,
  fadeOutFrames = 8,
): SceneFadePlan => {
  if (durationInFrames <= 1) {
    return {mode: 'constant', opacity: 1};
  }

  const requestedIn = Math.max(0, fadeInFrames);
  const requestedOut = Math.max(0, fadeOutFrames);

  // Max sum of in+out that still allows 0 < fi < duration-fo < duration.
  const maxTotal = durationInFrames - 1;
  let fi = Math.min(requestedIn, maxTotal);
  let fo = Math.min(requestedOut, maxTotal);

  if (fi + fo > maxTotal) {
    const scale = maxTotal / (fi + fo);
    fi = Math.floor(fi * scale);
    fo = maxTotal - fi;
  }

  if (fi <= 0 && fo <= 0) {
    return {mode: 'constant', opacity: 1};
  }

  if (fi <= 0) {
    const fadeOutStart = durationInFrames - fo;
    if (fadeOutStart <= 0) {
      return {
        mode: 'interpolate',
        inputRange: [0, durationInFrames],
        outputRange: [1, 0],
      };
    }
    return {
      mode: 'interpolate',
      inputRange: [0, fadeOutStart, durationInFrames],
      outputRange: [1, 1, 0],
    };
  }

  if (fo <= 0) {
    return {
      mode: 'interpolate',
      inputRange: [0, fi, durationInFrames],
      outputRange: [0, 1, 1],
    };
  }

  const fadeOutStart = durationInFrames - fo;
  return {
    mode: 'interpolate',
    inputRange: [0, fi, fadeOutStart, durationInFrames],
    outputRange: [0, 1, 1, 0],
  };
};
