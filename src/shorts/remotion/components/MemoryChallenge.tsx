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

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: shortFont,
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
      }}
    >
      {onScreenText ? (
        <div
          style={{
            position: 'absolute',
            top: SAFE.top,
            fontSize: 36,
            fontWeight: 700,
            color: shortColors.text,
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
          opacity: enter,
        }}
      >
        {visual.items.map((item, i) => {
          const isMissing =
            visual.phase === 'reveal' && item.id === visual.missingId;
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
                  : '1px solid rgba(148,163,184,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 64,
                color: item.color,
                opacity,
                transform: `scale(${spring({
                  frame: frame - i * 3,
                  fps,
                  config: {damping: 12},
                })})`,
              }}
            >
              {visual.phase === 'ask' ? '?' : item.symbol}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
