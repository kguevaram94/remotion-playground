import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {
  ConstraintCardsVisual,
  RiverPuzzleVisual,
  RiverSequenceVisual,
} from '../../domain/scene.schema';
import {SAFE, shortColors, shortFont} from '../theme';
import {SfxAt} from './Sfx';

const ICONS: Record<string, string> = {
  farmer: '🧑‍🌾',
  wolf: '🐺',
  goat: '🐐',
  cabbage: '🥬',
};

const Title: React.FC<{text?: string}> = ({text}) =>
  text ? (
    <div
      style={{
        position: 'absolute',
        top: SAFE.top,
        left: SAFE.side,
        right: SAFE.side,
        textAlign: 'center',
        fontSize: 34,
        fontWeight: 800,
        color: shortColors.text,
        whiteSpace: 'pre-wrap',
        lineHeight: 1.25,
      }}
    >
      {text}
    </div>
  ) : null;

const Bank: React.FC<{items: string[]; label: string}> = ({items, label}) => (
  <div
    style={{
      flex: 1,
      minHeight: 280,
      borderRadius: 24,
      background: 'linear-gradient(180deg, #14532d 0%, #052e16 100%)',
      border: `3px solid ${shortColors.success}`,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    }}
  >
    <div
      style={{
        fontSize: 18,
        fontWeight: 700,
        color: shortColors.muted,
        letterSpacing: '0.12em',
      }}
    >
      {label}
    </div>
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        flex: 1,
        alignContent: 'center',
      }}
    >
      {items.map((id) => (
        <div
          key={id}
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
          }}
        >
          {ICONS[id] ?? id}
        </div>
      ))}
    </div>
  </div>
);

export const RiverPuzzleScene: React.FC<{
  visual: RiverPuzzleVisual;
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
          gap: 16,
          width: '100%',
          maxWidth: 960,
          marginTop: 70,
          opacity: enter,
        }}
      >
        <Bank items={visual.leftBank} label="ORILLA A" />
        <div
          style={{
            width: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'linear-gradient(180deg, #0ea5e9 0%, #0369a1 100%)',
            borderRadius: 20,
          }}
        >
          <div style={{fontSize: 40}}>🚣</div>
          <div style={{fontSize: 16, fontWeight: 700, color: '#fff'}}>
            ×{visual.boatCapacity}
          </div>
        </div>
        <Bank items={visual.rightBank} label="ORILLA B" />
      </div>
    </AbsoluteFill>
  );
};

export const ConstraintCardsScene: React.FC<{
  visual: ConstraintCardsVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          width: '100%',
          maxWidth: 820,
          marginTop: 60,
        }}
      >
        {visual.pairs.map((pair, i) => {
          const enter = spring({
            frame: frame - i * 8,
            fps,
            config: {damping: 14, stiffness: 120},
          });
          return (
            <div
              key={pair.join('-')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                padding: '28px 32px',
                borderRadius: 22,
                background: '#3b1d1d',
                border: `3px solid ${shortColors.danger}`,
                opacity: enter,
                transform: `translateX(${interpolate(enter, [0, 1], [-40, 0])}px)`,
              }}
            >
              <span style={{fontSize: 52}}>{ICONS[pair[0]!] ?? pair[0]}</span>
              <span
                style={{fontSize: 36, fontWeight: 800, color: shortColors.danger}}
              >
                +
              </span>
              <span style={{fontSize: 52}}>{ICONS[pair[1]!] ?? pair[1]}</span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: shortColors.text,
                  marginLeft: 12,
                }}
              >
                = PELIGRO
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const RiverSequenceScene: React.FC<{
  visual: RiverSequenceVisual;
  onScreenText?: string;
  durationInFrames?: number;
}> = ({visual, onScreenText, durationInFrames: sequenceFrames}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames: configFrames} = useVideoConfig();
  const moves = visual.moves;
  const frames = sequenceFrames && sequenceFrames > 0 ? sequenceFrames : configFrames;
  const slot = Math.max(1, Math.floor(frames / moves.length));
  const stepIndex = Math.min(moves.length - 1, Math.floor(frame / slot));
  const startStep = visual.stepRange?.[0] ?? 1;

  return (
    <AbsoluteFill
      style={{
        fontFamily: shortFont,
        justifyContent: 'center',
        alignItems: 'center',
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
      }}
    >
      {moves.map((_, i) => (
        <SfxAt
          key={`move-${i}`}
          name="whoosh"
          from={i * slot}
          durationInFrames={Math.round(0.3 * fps)}
          volume={0.35}
        />
      ))}
      <Title text={onScreenText} />
      <div
        style={{
          marginTop: 40,
          padding: '18px 28px',
          borderRadius: 999,
          background: '#0f172a',
          border: `2px solid ${shortColors.accent}`,
          fontSize: 28,
          fontWeight: 800,
          color: shortColors.text,
        }}
      >
        Paso {startStep + stepIndex}
        {visual.finalState === 'all-safe' && stepIndex === moves.length - 1
          ? ' · ¡Todos a salvo!'
          : ''}
      </div>
      <div
        style={{
          marginTop: 36,
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          fontSize: 64,
        }}
      >
        {moves[stepIndex]!.map((id) => (
          <span key={id}>{ICONS[id] ?? id}</span>
        ))}
        <span style={{fontSize: 40, color: shortColors.accent}}>→</span>
        <span>🚣</span>
      </div>
      <div
        style={{
          marginTop: 40,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'center',
          maxWidth: 900,
        }}
      >
        {moves.map((move, i) => (
          <div
            key={i}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: i === stepIndex ? shortColors.accent : shortColors.panel,
              color: i === stepIndex ? '#0f172a' : shortColors.muted,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {startStep + i}. {move.map((m) => ICONS[m] ?? m).join(' ')}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
