import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {planSceneFade} from './scene-fade-plan';

/**
 * Remotion-native enter/exit fade (prefer over GSAP/Anime.js).
 * Driven purely by useCurrentFrame — deterministic for SSR render.
 *
 * Short / single-frame scenes use a safe plan (constant opacity or
 * shrunk fades) so interpolate inputRange stays strictly increasing.
 */
export const SceneFade: React.FC<{
  children: React.ReactNode;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  durationInFrames: number;
}> = ({
  children,
  fadeInFrames = 8,
  fadeOutFrames = 8,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const plan = planSceneFade(durationInFrames, fadeInFrames, fadeOutFrames);
  const opacity =
    plan.mode === 'constant'
      ? plan.opacity
      : interpolate(frame, plan.inputRange, plan.outputRange, {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};
