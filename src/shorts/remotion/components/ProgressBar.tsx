import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {shortColors} from '../theme';

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const progress = Math.min(1, frame / Math.max(1, durationInFrames - 1));

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          background: 'rgba(148,163,184,0.25)',
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${shortColors.accent}, ${shortColors.success})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
