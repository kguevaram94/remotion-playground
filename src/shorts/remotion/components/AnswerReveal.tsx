import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {SAFE, shortColors, shortFont} from '../theme';
import {SfxAt, SFX_VOLUME} from './Sfx';

export const AnswerReveal: React.FC<{
  headline: string;
  body?: string;
  accent?: string;
}> = ({headline, body, accent}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 12, stiffness: 110}});

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
      <SfxAt
        name="ding"
        from={0}
        durationInFrames={Math.round(0.55 * fps)}
        volume={SFX_VOLUME.ding}
      />
      <div
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: shortColors.text,
          opacity: enter,
          transform: `scale(${interpolate(enter, [0, 1], [0.85, 1])})`,
          maxWidth: 900,
          whiteSpace: 'pre-wrap',
        }}
      >
        {headline}
      </div>
      {body ? (
        <p
          style={{
            marginTop: 28,
            fontSize: 30,
            color: shortColors.muted,
            lineHeight: 1.4,
            maxWidth: 860,
            opacity: interpolate(frame, [10, 25], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            whiteSpace: 'pre-wrap',
          }}
        >
          {body}
        </p>
      ) : null}
      {accent ? (
        <div
          style={{
            marginTop: 32,
            fontSize: 28,
            fontWeight: 700,
            color: shortColors.warn,
          }}
        >
          {accent}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
