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
  const showAnswer = Boolean(visual.revealAnswer || visual.result !== undefined);
  const headline = showAnswer
    ? visual.revealAnswer ??
      (visual.result !== undefined
        ? `${visual.expression.replace(/\?\s*$/, '').trim()} ${visual.result}`
        : visual.expression)
    : visual.expression;

  const answerPop = showAnswer
    ? spring({frame: Math.max(0, frame - 8), fps, config: {damping: 12}})
    : 0;

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
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: shortColors.accent,
          marginBottom: 20,
          opacity: enter,
        }}
      >
        MATH
      </div>
      {onScreenText ? (
        <div
          style={{
            fontSize: 28,
            color: shortColors.muted,
            marginBottom: 28,
            opacity: enter,
            whiteSpace: 'pre-line',
          }}
        >
          {onScreenText}
        </div>
      ) : null}
      <div
        style={{
          fontSize: showAnswer ? 64 : 72,
          fontWeight: 800,
          color: showAnswer ? shortColors.accent : shortColors.text,
          letterSpacing: '0.04em',
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px) scale(${
            showAnswer ? interpolate(answerPop, [0, 1], [0.92, 1]) : 1
          })`,
        }}
      >
        {headline}
      </div>
      {visual.operands && visual.operator && visual.operator !== '=' ? (
        <div
          style={{
            marginTop: 28,
            fontSize: 32,
            color: shortColors.muted,
            opacity: interpolate(frame, [10, 25], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {visual.operands.join(` ${visual.operator} `)}
          {visual.result !== undefined ? ` = ${visual.result}` : ''}
        </div>
      ) : null}
      {visual.steps.length > 0 ? (
        <div style={{marginTop: 40, maxWidth: 840}}>
          {visual.steps.map((step, i) => {
            const opacity = interpolate(frame, [15 + i * 10, 30 + i * 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={`${i}-${step}`}
                style={{
                  color: shortColors.text,
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
