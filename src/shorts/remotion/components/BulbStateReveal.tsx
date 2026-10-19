import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {BulbStateRevealVisual} from '../../domain/scene.schema';
import {SAFE, shortColors, shortFont} from '../theme';
import {SfxAt, SFX_VOLUME} from './Sfx';

const META: Record<
  BulbStateRevealVisual['states'][number]['state'],
  {title: string; emoji: string; glow: string}
> = {
  on: {title: 'ENCENDIDA', emoji: '💡', glow: '#fbbf24'},
  'off-warm': {title: 'APAGADA + CALIENTE', emoji: '🔥', glow: '#fb923c'},
  'off-cold': {title: 'APAGADA + FRÍA', emoji: '❄️', glow: '#38bdf8'},
};

export const BulbStateReveal: React.FC<{
  visual: BulbStateRevealVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const states = visual.states;
  const slot = Math.max(1, Math.floor(durationInFrames / states.length));

  return (
    <AbsoluteFill
      style={{
        fontFamily: shortFont,
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <SfxAt
        name="ding"
        from={0}
        durationInFrames={Math.round(0.55 * fps)}
        volume={SFX_VOLUME.ding}
      />
      {states.map((_, i) => (
        <SfxAt
          key={`whoosh-${i}`}
          name="whoosh"
          from={i * slot + Math.round(0.06 * fps)}
          durationInFrames={Math.round(0.4 * fps)}
          volume={SFX_VOLUME.whoosh}
        />
      ))}

      {onScreenText ? (
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
            lineHeight: 1.3,
          }}
        >
          {onScreenText}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          width: '100%',
          maxWidth: 880,
          marginTop: 60,
        }}
      >
        {states.map((item, i) => {
          const local = frame - i * slot;
          const enter = spring({
            frame: local,
            fps,
            config: {damping: 13, stiffness: 120},
          });
          const meta = META[item.state];
          const visible = local >= 0;
          return (
            <div
              key={`${item.state}-${item.answer}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                padding: '22px 28px',
                borderRadius: 22,
                background: shortColors.panel,
                border: `2px solid ${meta.glow}88`,
                boxShadow: visible
                  ? `0 0 28px ${meta.glow}33`
                  : 'none',
                opacity: visible ? enter : 0,
                transform: `translateX(${interpolate(enter, [0, 1], [-40, 0])}px)`,
              }}
            >
              <div style={{fontSize: 52, width: 72, textAlign: 'center'}}>
                {meta.emoji}
              </div>
              <div style={{flex: 1, textAlign: 'left'}}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: shortColors.muted,
                    letterSpacing: '0.06em',
                  }}
                >
                  {meta.title}
                </div>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    color: shortColors.text,
                    marginTop: 4,
                  }}
                >
                  = interruptor {item.answer}
                </div>
              </div>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: `${meta.glow}22`,
                  border: `3px solid ${meta.glow}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 40,
                  fontWeight: 800,
                  color: meta.glow,
                }}
              >
                {item.answer}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
