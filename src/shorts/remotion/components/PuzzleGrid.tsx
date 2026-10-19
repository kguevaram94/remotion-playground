import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {FindDifferentVisual} from '../../domain/scene.schema';
import {SAFE, shortColors, shortFont} from '../theme';

export const PuzzleGrid: React.FC<{
  visual: FindDifferentVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 16}});
  const highlight = visual.highlightProgress;

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
            color: shortColors.text,
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          {onScreenText}
        </div>
      ) : null}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${visual.cols}, 1fr)`,
          gap: 20,
          width: 720,
          opacity: enter,
          transform: `scale(${interpolate(enter, [0, 1], [0.92, 1])})`,
        }}
      >
        {visual.cells.map((cell, i) => {
          const delay = i * 2;
          const cellEnter = spring({
            frame: frame - delay,
            fps,
            config: {damping: 14},
          });
          const isAnswer = cell.id === visual.answerCellId;
          const scale =
            isAnswer && highlight > 0
              ? interpolate(frame, [0, 20], [1, 1.18], {
                  extrapolateRight: 'clamp',
                })
              : 1;
          const dim =
            highlight > 0 && !isAnswer
              ? interpolate(highlight, [0, 1], [1, 0.35])
              : 1;

          return (
            <div
              key={cell.id}
              style={{
                aspectRatio: '1',
                borderRadius: 24,
                background: shortColors.panel,
                border: isAnswer && highlight > 0
                  ? `3px solid ${shortColors.warn}`
                  : '1px solid rgba(148,163,184,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 64,
                color: cell.color || shortColors.accent,
                opacity: Math.min(cellEnter, dim),
                transform: `scale(${Math.max(0, cellEnter) * scale})`,
              }}
            >
              {cell.label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
