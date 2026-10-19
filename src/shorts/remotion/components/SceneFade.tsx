import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

/**
 * Remotion-native enter/exit fade (prefer over GSAP/Anime.js).
 * Driven purely by useCurrentFrame — deterministic for SSR render.
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
  const opacity = interpolate(
    frame,
    [0, fadeInFrames, Math.max(fadeInFrames + 1, durationInFrames - fadeOutFrames), durationInFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};
