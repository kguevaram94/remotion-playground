import {Audio} from '@remotion/media';
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import type {VideoScript} from '../../domain/script.schema';
import type {Scene} from '../../domain/scene.schema';
import {secondsToFrames} from '../../utils/timing';
import {AnswerReveal} from '../components/AnswerReveal';
import {BulbStateReveal} from '../components/BulbStateReveal';
import {CountdownTimer} from '../components/CountdownTimer';
import {Hook} from '../components/Hook';
import {
  BoxDeductionScene,
  LabeledBoxesScene,
} from '../components/LabeledBoxes';
import {LogicRoom} from '../components/LogicRoom';
import {LogicScene} from '../components/LogicScene';
import {MathPuzzle} from '../components/MathPuzzle';
import {MemoryChallenge} from '../components/MemoryChallenge';
import {OpticalIllusion} from '../components/OpticalIllusion';
import {
  PipeFillScene,
  PipePuzzleScene,
  PipeTraceScene,
} from '../components/PipePuzzle';
import {ProgressBar} from '../components/ProgressBar';
import {PuzzleGrid} from '../components/PuzzleGrid';
import {
  ConstraintCardsScene,
  RiverPuzzleScene,
  RiverSequenceScene,
} from '../components/RiverCrossing';
import {SceneFade} from '../components/SceneFade';
import {SwitchSequence} from '../components/SwitchSequence';
import {
  SubtitleTrack,
  type SubtitleCueProp,
  type SubtitleWordProp,
} from '../components/SubtitleTrack';
import {
  GuardianCardsScene,
  SpeechBubbleScene,
  TwoCaseDiagramScene,
  TwoDoorsScene,
} from '../components/TwoDoors';
import {shortColors} from '../theme';
import {buildStudioShortVideoDefaults} from '../studio-defaults';

export type ShortVideoProps = {
  jobId: string;
  script: VideoScript | null;
  /** Path relative to public/, e.g. shorts/9-puntos/narration.wav */
  audioPublicFile: string | null;
  /** Path relative to public/, e.g. shorts/9-puntos/bg.mp3 */
  musicPublicFile: string | null;
  /** Background music volume 0–1 */
  musicVolume: number;
  subtitles: SubtitleCueProp[];
  /** Word timings for karaoke highlight */
  subtitleWords: SubtitleWordProp[];
  isTestAudio: boolean;
};

/** Studio defaults: plantilla oficial logic-lateral (visual; sin audio). */
export const shortVideoDefaultProps: ShortVideoProps =
  buildStudioShortVideoDefaults();

export const calculateShortVideoMetadata: CalculateMetadataFunction<
  ShortVideoProps
> = async ({props}) => {
  const script = props.script;
  const fps = script?.fps ?? 30;
  const durationSeconds =
    script?.scenes.reduce((a, s) => a + s.durationSeconds, 0) ?? 25;
  return {
    durationInFrames: secondsToFrames(durationSeconds, fps),
    fps,
    width: script?.resolution.width ?? 1080,
    height: script?.resolution.height ?? 1920,
    props,
  };
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 50) * 20;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${48 + drift * 0.1}% 18%, #12233f 0%, ${shortColors.bg} 52%, #030712 100%)`,
      }}
    />
  );
};

const SceneRenderer: React.FC<{
  scene: Scene;
  title: string;
  durationInFrames: number;
}> = ({scene, title, durationInFrames}) => {
  const {visual} = scene;
  const text = scene.onScreenText;

  if (visual.template === 'countdown') {
    return (
      <CountdownTimer
        seconds={visual.seconds}
        label={visual.label}
        durationInFrames={durationInFrames}
      />
    );
  }
  if (visual.template === 'hook') {
    return (
      <Hook title={text || title} badge={visual.badge} emphasis={visual.emphasis} />
    );
  }
  if (visual.template === 'find-different') {
    return <PuzzleGrid visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'math-puzzle') {
    return <MathPuzzle visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'optical-illusion') {
    return <OpticalIllusion visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'logic-puzzle') {
    return <LogicScene visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'logic-room') {
    return <LogicRoom visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'switch-sequence') {
    return <SwitchSequence visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'bulb-state-reveal') {
    return <BulbStateReveal visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'two-doors') {
    return <TwoDoorsScene visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'guardian-cards') {
    return <GuardianCardsScene visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'speech-bubble') {
    return <SpeechBubbleScene visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'two-case-diagram') {
    return <TwoCaseDiagramScene visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'river-puzzle') {
    return <RiverPuzzleScene visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'constraint-cards') {
    return <ConstraintCardsScene visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'river-sequence') {
    return (
      <RiverSequenceScene
        visual={visual}
        onScreenText={text}
        durationInFrames={durationInFrames}
      />
    );
  }
  if (visual.template === 'pipe-puzzle') {
    return <PipePuzzleScene visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'pipe-trace') {
    return (
      <PipeTraceScene
        visual={visual}
        onScreenText={text}
        durationInFrames={durationInFrames}
      />
    );
  }
  if (visual.template === 'pipe-fill') {
    return (
      <PipeFillScene
        visual={visual}
        onScreenText={text}
        durationInFrames={durationInFrames}
      />
    );
  }
  if (visual.template === 'labeled-boxes') {
    return <LabeledBoxesScene visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'box-deduction') {
    return <BoxDeductionScene visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'memory-challenge') {
    return <MemoryChallenge visual={visual} onScreenText={text} />;
  }
  if (visual.template === 'text') {
    return (
      <AnswerReveal
        headline={visual.headline || text}
        body={visual.body}
        accent={visual.accent}
      />
    );
  }
  return <AnswerReveal headline={text || title} />;
};

export const ShortVideo: React.FC<ShortVideoProps> = (props) => {
  const script = props.script;
  const frame = useCurrentFrame();

  if (!script) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: shortColors.bg,
          justifyContent: 'center',
          alignItems: 'center',
          color: shortColors.text,
          fontSize: 36,
          padding: 48,
          textAlign: 'center',
        }}
      >
        ShortVideo — ejecuta `npm run short -- "título"` para generar un guion.
      </AbsoluteFill>
    );
  }

  const fps = script.fps;
  let cursor = 0;
  const timed = script.scenes.map((scene) => {
    const durationInFrames = secondsToFrames(scene.durationSeconds, fps);
    const from = cursor;
    cursor += durationInFrames;
    return {...scene, from, durationInFrames};
  });

  const cues =
    props.subtitles.length > 0
      ? props.subtitles
      : timed.map((s) => ({
          startMs: (s.from / fps) * 1000,
          endMs: ((s.from + s.durationInFrames) / fps) * 1000,
          text: s.subtitleText,
        }));

  const testBannerOpacity = props.isTestAudio
    ? interpolate(frame, [0, 10], [0, 0.9], {
        extrapolateRight: 'clamp',
      })
    : 0;

  return (
    <AbsoluteFill style={{backgroundColor: shortColors.bg}}>
      <Background />
      {timed.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.from}
          durationInFrames={scene.durationInFrames}
        >
          <SceneFade durationInFrames={scene.durationInFrames}>
            <SceneRenderer
              scene={scene}
              title={script.title}
              durationInFrames={scene.durationInFrames}
            />
          </SceneFade>
        </Sequence>
      ))}
      <SubtitleTrack cues={cues} words={props.subtitleWords} />
      <ProgressBar />
      {props.isTestAudio ? (
        <AbsoluteFill
          style={{
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingTop: 28,
            pointerEvents: 'none',
            opacity: testBannerOpacity,
          }}
        >
          <div
            style={{
              background: 'rgba(251, 191, 36, 0.92)',
              color: '#111827',
              fontWeight: 800,
              fontSize: 22,
              padding: '8px 16px',
              borderRadius: 999,
            }}
          >
            AUDIO DE PRUEBA — no publicar
          </div>
        </AbsoluteFill>
      ) : null}
      {props.musicPublicFile ? (
        <Audio
          src={staticFile(props.musicPublicFile)}
          volume={props.musicVolume}
          loop
        />
      ) : null}
      {props.audioPublicFile ? (
        <Audio src={staticFile(props.audioPublicFile)} volume={1} />
      ) : null}
    </AbsoluteFill>
  );
};
