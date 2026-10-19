import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {MathPuzzleVisual} from '../../domain/scene.schema';
import {SAFE, shortColors, shortFont} from '../theme';

export const MathPuzzle: React.FC<{
  visual: MathPuzzleVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 14}});
  const showAnswer = Boolean(visual.revealAnswer);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: shortFont,
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 28,
          color: shortColors.muted,
          marginBottom: 32,
          opacity: enter,
        }}
      >
        {onScreenText || 'Ecuación'}
      </div>
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: shortColors.text,
          letterSpacing: '0.04em',
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
        }}
      >
        {showAnswer ? visual.revealAnswer : visual.expression}
      </div>
      {visual.steps.length > 0 ? (
        <div style={{marginTop: 40, maxWidth: 800}}>
          {visual.steps.map((step, i) => {
            const opacity = interpolate(frame, [15 + i * 10, 30 + i * 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={step}
                style={{
                  color: shortColors.accent,
                  fontSize: 28,
                  marginTop: 12,
                  opacity,
                }}
              >
                {step}
              </div>
            );
          })}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
