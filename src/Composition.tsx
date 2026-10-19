import {
  AbsoluteFill,
  Composition,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  ScriptVideo,
  calculateScriptVideoMetadata,
  scriptVideoDefaultProps,
} from './ScriptVideo';
import {
  ShortVideo,
  calculateShortVideoMetadata,
  shortVideoDefaultProps,
} from './shorts/remotion/compositions/ShortVideo';

export const MyComposition = () => {
  return (
    <>
      <Composition
        id="HelloRemotion"
        component={HelloRemotion}
        durationInFrames={90}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="ScriptVideo"
        component={ScriptVideo}
        durationInFrames={30 * 97}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={scriptVideoDefaultProps}
        calculateMetadata={calculateScriptVideoMetadata}
      />
      <Composition
        id="ShortVideo"
        component={ShortVideo}
        durationInFrames={30 * 25}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={shortVideoDefaultProps}
        calculateMetadata={calculateShortVideoMetadata}
      />
    </>
  );
};

const HelloRemotion: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const titleScale = spring({
    frame,
    fps,
    config: {damping: 12, stiffness: 100},
  });

  const subtitleOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subtitleY = interpolate(frame, [20, 40], [24, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const circleScale = spring({
    frame: frame - 35,
    fps,
    config: {damping: 14},
  });

  const orbitAngle = interpolate(frame, [0, 90], [0, Math.PI * 2]);

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 30% 20%, #1e3a5f 0%, #0b1220 55%, #05080f 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
          opacity: 0.35,
          transform: `translate(${Math.cos(orbitAngle) * 220}px, ${Math.sin(orbitAngle) * 120}px) scale(${Math.max(0, circleScale)})`,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          transform: `scale(${titleScale})`,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#f8fafc',
          }}
        >
          Remotion
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 28,
            color: '#94a3b8',
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          Playground de videos animados
        </p>
      </div>
    </AbsoluteFill>
  );
};
