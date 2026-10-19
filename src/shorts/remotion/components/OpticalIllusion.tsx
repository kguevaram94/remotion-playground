import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {OpticalIllusionVisual} from '../../domain/scene.schema';
import {SAFE, shortColors, shortFont} from '../theme';

export const OpticalIllusion: React.FC<{
  visual: OpticalIllusionVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const W = width;
  const H = height;
  const enter = spring({frame, fps, config: {damping: 14}});
  const guideOpacity = visual.showGuides
    ? interpolate(frame, [0, 18], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const comparePop = visual.compareMode
    ? spring({frame: Math.max(0, frame - 6), fps, config: {damping: 12}})
    : 0;

  const lineShapes = visual.shapes.filter((s) => s.kind === 'line');
  const guideXs =
    lineShapes.length > 0
      ? [lineShapes[0].x, lineShapes[0].x + lineShapes[0].size]
      : [0.2, 0.8];
  const guideYTop =
    lineShapes.length > 0
      ? Math.min(...lineShapes.map((l) => l.y)) - 0.08
      : 0.22;
  const guideYBottom =
    lineShapes.length > 0
      ? Math.max(...lineShapes.map((l) => l.y)) + 0.08
      : 0.63;

  return (
    <AbsoluteFill
      style={{
        fontFamily: shortFont,
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
        opacity: enter,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: shortColors.accent,
          marginBottom: 12,
        }}
      >
        ILUSIÓN
      </div>
      {onScreenText ? (
        <div
          style={{
            textAlign: 'center',
            color: shortColors.text,
            fontSize: 36,
            fontWeight: 700,
            marginBottom: 24,
            whiteSpace: 'pre-line',
          }}
        >
          {onScreenText}
        </div>
      ) : null}
      <svg width="100%" height="70%" viewBox={`0 0 ${W} ${H * 0.7}`}>
        {visual.shapes.map((shape) => {
          const x = shape.x * W;
          const y = shape.y * H * 0.5;
          if (shape.kind === 'line') {
            return (
              <line
                key={shape.id}
                x1={x}
                y1={y}
                x2={x + shape.size * W}
                y2={y}
                stroke={shape.color}
                strokeWidth={8}
                strokeLinecap="round"
              />
            );
          }
          if (shape.kind === 'circle') {
            return (
              <circle
                key={shape.id}
                cx={x}
                cy={y}
                r={shape.size * 80}
                fill={shape.color}
              />
            );
          }
          if (shape.kind === 'arrow') {
            const len = shape.size * W;
            const angle = (shape.rotation * Math.PI) / 180;
            const x2 = x + Math.cos(angle) * len;
            const y2 = y + Math.sin(angle) * len;
            return (
              <line
                key={shape.id}
                x1={x}
                y1={y}
                x2={x2}
                y2={y2}
                stroke={shape.color}
                strokeWidth={6}
                strokeLinecap="round"
              />
            );
          }
          return (
            <rect
              key={shape.id}
              x={x}
              y={y}
              width={shape.size * 100}
              height={shape.size * 60}
              fill={shape.color}
              rx={8}
            />
          );
        })}
        {visual.showGuides ? (
          <g opacity={guideOpacity}>
            {guideXs.map((gx, i) => (
              <line
                key={`guide-${i}`}
                x1={gx * W}
                y1={guideYTop * H * 0.5}
                x2={gx * W}
                y2={guideYBottom * H * 0.5}
                stroke={shortColors.success}
                strokeWidth={3}
                strokeDasharray="10 8"
              />
            ))}
          </g>
        ) : null}
      </svg>
      {visual.compareMode ? (
        <div
          style={{
            textAlign: 'center',
            color: shortColors.success,
            fontSize: 40,
            fontWeight: 800,
            transform: `scale(${0.85 + 0.15 * comparePop})`,
            opacity: comparePop,
          }}
        >
          Misma longitud
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
