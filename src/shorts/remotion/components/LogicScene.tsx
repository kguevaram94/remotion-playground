import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {LogicPuzzleVisual} from '../../domain/scene.schema';
import {SAFE, shortColors, shortFont} from '../theme';
import {SfxAt, SFX_VOLUME} from './Sfx';

export const LogicScene: React.FC<{
  visual: LogicPuzzleVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {width, fps} = useVideoConfig();
  const size = Math.min(720, width - SAFE.side * 2);
  const progress = visual.revealProgress;
  const lineDraw = interpolate(frame, [0, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (visual.variant === 'nine-dots') {
    const dots = visual.dots ?? [];
    const lines = visual.lines ?? [];
    const pad = 40;
    const drawFrames = 45;

    return (
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: shortFont,
          paddingBottom: SAFE.bottom,
        }}
      >
        {progress > 0 &&
          lines.map((_, i) => {
            const startFrame = Math.floor(
              (i / Math.max(1, lines.length)) * drawFrames,
            );
            return (
              <SfxAt
                key={`whoosh-${i}`}
                name="whoosh"
                from={startFrame}
                durationInFrames={Math.round(0.3 * fps)}
                volume={SFX_VOLUME.whoosh}
              />
            );
          })}
        {onScreenText ? (
          <div
            style={{
              position: 'absolute',
              top: SAFE.top,
              color: shortColors.text,
              fontSize: 36,
              fontWeight: 700,
              textAlign: 'center',
              padding: `0 ${SAFE.side}px`,
            }}
          >
            {onScreenText}
          </div>
        ) : null}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {progress > 0 &&
            lines.map((line, i) => {
              const local = interpolate(
                lineDraw,
                [i / lines.length, (i + 1) / lines.length],
                [0, 1],
                {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
              );
              const x1 = pad + line.from[0] * (size - pad * 2);
              const y1 = pad + line.from[1] * (size - pad * 2);
              const x2 = pad + line.to[0] * (size - pad * 2);
              const y2 = pad + line.to[1] * (size - pad * 2);
              const x = x1 + (x2 - x1) * local;
              const y = y1 + (y2 - y1) * local;
              return (
                <line
                  key={`l${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x}
                  y2={y}
                  stroke={shortColors.accent}
                  strokeWidth={8}
                  strokeLinecap="round"
                />
              );
            })}
          {dots.map((dot) => (
            <circle
              key={dot.id}
              cx={pad + dot.x * (size - pad * 2)}
              cy={pad + dot.y * (size - pad * 2)}
              r={18}
              fill={shortColors.text}
            />
          ))}
        </svg>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: shortFont,
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
      }}
    >
      <SfxAt name="pop" from={0} durationInFrames={16} volume={SFX_VOLUME.pop} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          width: 640,
        }}
      >
        {visual.objects.map((obj) => (
          <div
            key={obj.id}
            style={{
              aspectRatio: '1',
              border: `2px solid ${shortColors.muted}`,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: shortColors.text,
              fontSize: 40,
            }}
          >
            {obj.label}
          </div>
        ))}
      </div>
      {onScreenText ? (
        <div
          style={{
            marginTop: 32,
            fontSize: 40,
            fontWeight: 800,
            color: shortColors.text,
          }}
        >
          {onScreenText}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
