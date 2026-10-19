import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SAFE, shortColors, shortFont} from '../theme';
import {SfxAt} from './Sfx';

export const Hook: React.FC<{
  title: string;
  badge?: string;
  emphasis?: string;
}> = ({title, badge, emphasis}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 14, stiffness: 120}});
  const y = interpolate(enter, [0, 1], [40, 0]);

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
      <SfxAt name="pop" from={0} durationInFrames={15} volume={0.35} />
      {badge ? (
        <div
          style={{
            color: shortColors.accent,
            letterSpacing: '0.18em',
            fontWeight: 700,
            fontSize: 22,
            marginBottom: 28,
            opacity: enter,
          }}
        >
          {badge}
        </div>
      ) : null}
      <h1
        style={{
          margin: 0,
          fontSize: 64,
          fontWeight: 800,
          color: shortColors.text,
          lineHeight: 1.15,
          transform: `translateY(${y}px)`,
          opacity: enter,
          maxWidth: 920,
        }}
      >
        {title}
      </h1>
      {emphasis ? (
        <p
          style={{
            marginTop: 28,
            fontSize: 32,
            color: shortColors.warn,
            fontWeight: 700,
            opacity: interpolate(frame, [12, 28], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {emphasis}
        </p>
      ) : null}
    </AbsoluteFill>
  );
};
