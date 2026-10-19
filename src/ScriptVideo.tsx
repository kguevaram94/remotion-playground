import type {TikTokPage} from '@remotion/captions';
import {Audio} from '@remotion/media';
import {getAudioDurationInSeconds} from '@remotion/media-utils';
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import captionPages from './data/caption-pages.json';
import {
  FilterDefinitionScene,
  HarmScene,
  HypothesisScene,
  RelationshipScene,
  RemedyScene,
  SeekingEvidenceScene,
  TitleScene,
} from './scenes/InfographicScenes';
import {colors, font} from './scenes/shared';

export type ScriptVideoProps = {
  audioFile: string;
  title: string;
};

const FPS = 30;

/** Scene timeline aligned to the voiceover (ms from captions). */
const SCENES = [
  {id: 'title', fromMs: 0, toMs: 1960, component: 'title'},
  {id: 'hypothesis', fromMs: 1960, toMs: 10870, component: 'hypothesis'},
  {id: 'seeking', fromMs: 10870, toMs: 18890, component: 'seeking'},
  {id: 'filter', fromMs: 18890, toMs: 40990, component: 'filter'},
  {id: 'relationship', fromMs: 40990, toMs: 64670, component: 'relationship'},
  {id: 'harm', fromMs: 64670, toMs: 82980, component: 'harm'},
  {id: 'remedy', fromMs: 82980, toMs: 96181, component: 'remedy'},
] as const;

export const scriptVideoDefaultProps: ScriptVideoProps = {
  audioFile: 'audio.mp3',
  title: 'Sesgo de Confirmación',
};

export const calculateScriptVideoMetadata: CalculateMetadataFunction<
  ScriptVideoProps
> = async ({props}) => {
  const durationInSeconds = await getAudioDurationInSeconds(
    staticFile(props.audioFile),
  );

  return {
    durationInFrames: Math.ceil(durationInSeconds * FPS),
    props,
  };
};

const msToFrames = (ms: number, fps: number) => Math.round((ms / 1000) * fps);

const AnimatedBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 30;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${50 + drift * 0.15}% 12%, #12305a 0%, ${colors.bg} 48%, #020617 100%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(circle at 50% 35%, black 0%, transparent 75%)',
          opacity: 0.5,
        }}
      />
    </AbsoluteFill>
  );
};

const CaptionOverlay: React.FC<{page: TikTokPage}> = ({page}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const timeMs = (frame / fps) * 1000 + page.startMs;
  const enter = spring({
    frame,
    fps,
    config: {damping: 18, stiffness: 140},
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 48,
        paddingLeft: 36,
        paddingRight: 36,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [12, 0])}px)`,
          backgroundColor: 'rgba(2, 6, 23, 0.82)',
          border: '1px solid rgba(148,163,184,0.2)',
          borderRadius: 14,
          padding: '10px 16px',
          maxWidth: 980,
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          fontFamily: font,
          lineHeight: 1.25,
        }}
      >
        {page.tokens.map((token) => {
          const active = timeMs >= token.fromMs && timeMs < token.toMs;
          const spoken = timeMs >= token.toMs;
          return (
            <span
              key={`${token.fromMs}-${token.text}`}
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: active ? colors.accent : spoken ? '#e2e8f0' : '#64748b',
              }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const SceneContent: React.FC<{
  kind: (typeof SCENES)[number]['component'];
  title: string;
}> = ({kind, title}) => {
  switch (kind) {
    case 'title':
      return <TitleScene title={title} />;
    case 'hypothesis':
      return <HypothesisScene />;
    case 'seeking':
      return <SeekingEvidenceScene />;
    case 'filter':
      return <FilterDefinitionScene />;
    case 'relationship':
      return <RelationshipScene />;
    case 'harm':
      return <HarmScene />;
    case 'remedy':
      return <RemedyScene />;
    default:
      return null;
  }
};

export const ScriptVideo: React.FC<ScriptVideoProps> = ({
  audioFile,
  title,
}) => {
  const {fps} = useVideoConfig();
  const pages = captionPages as TikTokPage[];

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      <AnimatedBackground />

      {SCENES.map((scene) => {
        const from = msToFrames(scene.fromMs, fps);
        const durationInFrames = Math.max(
          1,
          msToFrames(scene.toMs, fps) - from,
        );

        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={durationInFrames}
          >
            <SceneContent kind={scene.component} title={title} />
          </Sequence>
        );
      })}

      {pages.map((page) => {
        const startFrame = Math.floor((page.startMs / 1000) * fps);
        const durationInFrames = Math.max(
          1,
          Math.ceil((page.durationMs / 1000) * fps),
        );

        return (
          <Sequence
            key={`cap-${page.startMs}`}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            <CaptionOverlay page={page} />
          </Sequence>
        );
      })}

      <Audio src={staticFile(audioFile)} />
    </AbsoluteFill>
  );
};
