import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {SAFE, shortColors, shortFont} from '../theme';
import {SfxAt} from './Sfx';

export const CountdownTimer: React.FC<{
  seconds: number;
  label?: string;
  /** Sequence length in frames (not composition length) */
  durationInFrames?: number;
}> = ({seconds, label = 'Resuelve', durationInFrames: sequenceFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const frames = sequenceFrames && sequenceFrames > 0 ? sequenceFrames : seconds * fps;
  const total = Math.max(1, frames / fps);
  const remaining = Math.max(0, Math.ceil(total - frame / fps));
  const pulse = interpolate(frame % fps, [0, fps / 2, fps], [1, 1.08, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tickCount = Math.min(Math.floor(total), 12);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: shortFont,
        paddingTop: SAFE.top,
        paddingBottom: SAFE.bottom,
      }}
    >
      {Array.from({length: tickCount}, (_, i) => (
        <SfxAt
          key={`tick-${i}`}
          name="tick"
          from={i * fps}
          durationInFrames={Math.min(fps, 12)}
          volume={remaining <= 3 && i >= tickCount - 3 ? 0.5 : 0.32}
        />
      ))}
      <div style={{color: shortColors.muted, fontSize: 28, marginBottom: 24}}>
        {label}
      </div>
      <div
        style={{
          fontSize: 160,
          fontWeight: 800,
          color: remaining <= 2 ? shortColors.danger : shortColors.text,
          transform: `scale(${pulse})`,
        }}
      >
        {remaining}
      </div>
    </AbsoluteFill>
  );
};
