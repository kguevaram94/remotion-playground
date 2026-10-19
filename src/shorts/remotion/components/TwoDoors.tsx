import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {
  GuardianCardsVisual,
  SpeechBubbleVisual,
  TwoCaseDiagramVisual,
  TwoDoorsVisual,
} from '../../domain/scene.schema';
import {SAFE, shortColors, shortFont} from '../theme';
import {SfxAt} from './Sfx';

const Title: React.FC<{text?: string}> = ({text}) =>
  text ? (
    <div
      style={{
        position: 'absolute',
        top: SAFE.top,
        left: SAFE.side,
        right: SAFE.side,
        textAlign: 'center',
        fontSize: 36,
        fontWeight: 800,
        color: shortColors.text,
        whiteSpace: 'pre-wrap',
        lineHeight: 1.25,
      }}
    >
      {text}
    </div>
  ) : null;

export const TwoDoorsScene: React.FC<{
  visual: TwoDoorsVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 14, stiffness: 120}});

  return (
    <AbsoluteFill
      style={{
        fontFamily: shortFont,
        justifyContent: 'center',
        alignItems: 'center',
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
      }}
    >
      <SfxAt name="pop" from={0} durationInFrames={15} volume={0.35} />
      <Title text={onScreenText} />
      <div
        style={{
          display: 'flex',
          gap: 48,
          marginTop: 80,
          opacity: enter,
          transform: `scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
        }}
      >
        {visual.doors.map((door, i) => (
          <div
            key={door}
            style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}
          >
            <div
              style={{
                width: 160,
                height: 280,
                borderRadius: '16px 16px 8px 8px',
                background: `linear-gradient(180deg, #78350f 0%, #451a03 100%)`,
                border: `4px solid ${shortColors.warn}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 40px #0008',
              }}
            >
              <div style={{fontSize: 56, fontWeight: 800, color: shortColors.warn}}>{door}</div>
            </div>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                background: '#1e293b',
                border: `3px solid ${shortColors.muted}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
              }}
            >
              {visual.guardians[i] === 'truth' ? '🙂' : visual.guardians[i] === 'liar' ? '😈' : '❓'}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const GuardianCardsScene: React.FC<{
  visual: GuardianCardsVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const labels = visual.showUnknownIdentities
    ? ['¿VERDAD?', '¿MENTIRA?']
    : ['VERDAD', 'MENTIRA'];

  return (
    <AbsoluteFill
      style={{
        fontFamily: shortFont,
        justifyContent: 'center',
        alignItems: 'center',
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
      }}
    >
      <Title text={onScreenText} />
      <div style={{display: 'flex', gap: 28, marginTop: 60, width: '100%', maxWidth: 900}}>
        {labels.map((label, i) => {
          const enter = spring({
            frame: frame - i * 6,
            fps,
            config: {damping: 14, stiffness: 120},
          });
          return (
            <div
              key={label}
              style={{
                flex: 1,
                padding: '36px 24px',
                borderRadius: 24,
                background: shortColors.panel,
                border: `3px dashed ${shortColors.accent}`,
                textAlign: 'center',
                opacity: enter,
                transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
              }}
            >
              <div style={{fontSize: 64, marginBottom: 16}}>👤</div>
              <div style={{fontSize: 28, fontWeight: 800, color: shortColors.text}}>{label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const SpeechBubbleScene: React.FC<{
  visual: SpeechBubbleVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 14, stiffness: 110}});

  return (
    <AbsoluteFill
      style={{
        fontFamily: shortFont,
        justifyContent: 'center',
        alignItems: 'center',
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
      }}
    >
      <SfxAt name="whoosh" from={0} durationInFrames={12} volume={0.35} />
      <Title text={onScreenText} />
      <div
        style={{
          marginTop: 40,
          maxWidth: 860,
          padding: '40px 36px',
          borderRadius: 28,
          background: '#0f172a',
          border: `3px solid ${shortColors.accent}`,
          boxShadow: `0 0 40px ${shortColors.accent}33`,
          opacity: enter,
          transform: `scale(${interpolate(enter, [0, 1], [0.88, 1])})`,
        }}
      >
        <div style={{fontSize: 22, color: shortColors.accent, fontWeight: 700, marginBottom: 16}}>
          PREGUNTA
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: shortColors.text,
            lineHeight: 1.35,
          }}
        >
          «{visual.question}»
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const TwoCaseDiagramScene: React.FC<{
  visual: TwoCaseDiagramVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const slot = Math.max(1, Math.floor(durationInFrames / Math.max(1, visual.cases.length)));

  return (
    <AbsoluteFill
      style={{
        fontFamily: shortFont,
        justifyContent: 'center',
        alignItems: 'center',
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
      }}
    >
      <SfxAt name="ding" from={0} durationInFrames={Math.round(0.4 * fps)} volume={0.4} />
      <Title text={onScreenText} />
      <div style={{display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 880, marginTop: 50}}>
        {visual.cases.map((c, i) => {
          const local = frame - i * slot;
          const enter = spring({frame: local, fps, config: {damping: 13, stiffness: 120}});
          const label =
            c === 'ask-truthful'
              ? 'Si preguntas al sincero → señala la incorrecta'
              : c === 'ask-liar'
                ? 'Si preguntas al mentiroso → señala la incorrecta'
                : c;
          return (
            <div
              key={c}
              style={{
                padding: '22px 28px',
                borderRadius: 20,
                background: shortColors.panel,
                border: `2px solid ${shortColors.danger}`,
                color: shortColors.text,
                fontSize: 28,
                fontWeight: 700,
                opacity: local >= 0 ? enter : 0,
              }}
            >
              {label}
            </div>
          );
        })}
        <div
          style={{
            marginTop: 12,
            textAlign: 'center',
            fontSize: 36,
            fontWeight: 800,
            color: shortColors.success,
          }}
        >
          → Elige la puerta contraria
        </div>
      </div>
    </AbsoluteFill>
  );
};
