import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {
  BoxDeductionVisual,
  LabeledBoxesVisual,
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

const BoxCard: React.FC<{
  label: string;
  crossed?: boolean;
  highlight?: boolean;
  delay?: number;
  fruit?: string;
}> = ({label, crossed, highlight, delay = 0, fruit}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: {damping: 14, stiffness: 120},
  });

  return (
    <div
      style={{
        width: 220,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [28, 0])}px) scale(${highlight ? 1.06 : 1})`,
      }}
    >
      <div
        style={{
          height: 200,
          borderRadius: 20,
          background: 'linear-gradient(180deg, #92400e 0%, #451a03 55%, #1c1917 100%)',
          border: `4px solid ${highlight ? shortColors.warn : shortColors.muted}`,
          boxShadow: highlight ? `0 0 32px ${shortColors.warn}55` : '0 10px 30px #0007',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{fontSize: 56}}>{fruit ?? '📦'}</div>
        {crossed ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, transparent 46%, #fb7185 46%, #fb7185 54%, transparent 54%)',
              opacity: 0.85,
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          marginTop: 14,
          padding: '10px 12px',
          borderRadius: 12,
          background: crossed ? '#3b1d1d' : '#0f172a',
          border: `2px solid ${crossed ? shortColors.danger : shortColors.accent}`,
          textAlign: 'center',
          fontSize: 22,
          fontWeight: 800,
          color: shortColors.text,
          textDecoration: crossed ? 'line-through' : 'none',
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const LabeledBoxesScene: React.FC<{
  visual: LabeledBoxesVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
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
          gap: 28,
          marginTop: 70,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        {visual.labels.map((label, i) => (
          <BoxCard
            key={label}
            label={label}
            delay={i * 5}
            crossed={visual.crossOutLabels}
            highlight={
              Boolean(visual.highlightLabel) &&
              label.toLowerCase() === visual.highlightLabel!.toLowerCase()
            }
            fruit={visual.contentsHidden ? '❓' : undefined}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const BoxDeductionScene: React.FC<{
  visual: BoxDeductionVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const step = frame < 40 ? 0 : frame < 80 ? 1 : 2;
  const enter = spring({frame, fps, config: {damping: 13, stiffness: 110}});

  return (
    <AbsoluteFill
      style={{
        fontFamily: shortFont,
        justifyContent: 'center',
        alignItems: 'center',
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
      }}
    >
      <SfxAt name="ding" from={0} durationInFrames={Math.round(0.45 * fps)} volume={0.4} />
      <Title text={onScreenText} />
      <div
        style={{
          marginTop: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          width: '100%',
          maxWidth: 860,
          opacity: enter,
        }}
      >
        <div
          style={{
            padding: '22px 26px',
            borderRadius: 18,
            background: shortColors.panel,
            border: `2px solid ${shortColors.warn}`,
            fontSize: 28,
            fontWeight: 700,
            color: shortColors.text,
          }}
        >
          1. Abre «{visual.firstBoxLabel}» → no puede ser mezcla
        </div>
        {visual.sampleOneFruit && step >= 1 ? (
          <div
            style={{
              padding: '22px 26px',
              borderRadius: 18,
              background: shortColors.panel,
              border: `2px solid ${shortColors.accent}`,
              fontSize: 28,
              fontWeight: 700,
              color: shortColors.text,
            }}
          >
            2. Una fruta revela su contenido real
          </div>
        ) : null}
        {visual.deduceRemainingBoxes && step >= 2 ? (
          <div
            style={{
              padding: '22px 26px',
              borderRadius: 18,
              background: shortColors.panel,
              border: `2px solid ${shortColors.success}`,
              fontSize: 28,
              fontWeight: 700,
              color: shortColors.text,
            }}
          >
            3. Las otras dos se deducen por eliminación
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
