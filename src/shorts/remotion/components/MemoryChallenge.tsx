import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {MemoryChallengeVisual} from '../../domain/scene.schema';
import {SAFE, shortColors, shortFont} from '../theme';

export const MemoryChallenge: React.FC<{
  visual: MemoryChallengeVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 14}});
  const hidden = visual.phase === 'hide';
  const asking = visual.phase === 'ask';
  const revealing = visual.phase === 'reveal';

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: shortFont,
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: SAFE.top,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: shortColors.accent,
          opacity: enter,
        }}
      >
        MEMORY
      </div>
      {onScreenText ? (
        <div
          style={{
            position: 'absolute',
            top: SAFE.top + 44,
            fontSize: 36,
            fontWeight: 700,
            color: shortColors.text,
            textAlign: 'center',
            padding: '0 40px',
          }}
        >
          {onScreenText}
        </div>
      ) : null}
      <div
        style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 800,
          marginTop: 48,
          opacity: enter,
        }}
      >
        {visual.items.map((item, i) => {
          const isMissing = revealing && item.id === visual.missingId;
          const opacity = hidden
            ? interpolate(frame, [0, 15], [1, 0], {
                extrapolateRight: 'clamp',
              })
            : 1;
          return (
            <div
              key={item.id}
              style={{
                width: 140,
                height: 140,
                borderRadius: 28,
                background: shortColors.panel,
                border: isMissing
                  ? `3px solid ${shortColors.warn}`
                  : asking
                    ? `2px solid ${shortColors.accent}`
                    : '1px solid rgba(148,163,184,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 64,
                color: item.color,
                opacity,
                boxShadow: isMissing
                  ? `0 0 28px ${shortColors.warn}55`
                  : undefined,
                transform: `scale(${spring({
                  frame: frame - i * 3,
                  fps,
                  config: {damping: 12},
                })})`,
              }}
            >
              {item.symbol}
            </div>
          );
        })}
      </div>
      {asking && visual.missingId ? (
        <div
          style={{
            marginTop: 36,
            fontSize: 28,
            color: shortColors.muted,
            opacity: interpolate(frame, [10, 25], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          Falta 1 símbolo
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
