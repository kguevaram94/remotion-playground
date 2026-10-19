import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {LogicRoomVisual} from '../../domain/scene.schema';
import {SAFE, shortColors, shortFont} from '../theme';
import {SfxAt, SFX_VOLUME} from './Sfx';

const SwitchPlate: React.FC<{
  label: string;
  on: boolean;
  delay: number;
}> = ({label, on, delay}) => {
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        opacity: interpolate(enter, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 72,
          height: 120,
          borderRadius: 14,
          background: '#1e293b',
          border: `3px solid ${on ? shortColors.warn : shortColors.muted}`,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: on ? 62 : 12,
          boxShadow: on ? `0 0 24px ${shortColors.warn}66` : 'none',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: on ? shortColors.warn : '#64748b',
          }}
        />
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: shortColors.text,
        }}
      >
        {label}
      </div>
    </div>
  );
};

const Bulb: React.FC<{mode: LogicRoomVisual['bulb']}> = ({mode}) => {
  const frame = useCurrentFrame();
  const glow = interpolate(frame % 40, [0, 20, 40], [0.55, 0.9, 0.55]);

  if (mode === 'hidden') {
    return (
      <div
        style={{
          width: 220,
          height: 280,
          borderRadius: 24,
          background: '#0b1220',
          border: `3px dashed ${shortColors.muted}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{fontSize: 64, opacity: 0.5}}>🚪</div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: shortColors.muted,
            letterSpacing: '0.08em',
          }}
        >
          OCULTA
        </div>
      </div>
    );
  }

  const lit = mode === 'on';
  const warm = mode === 'warm';
  const color = lit ? '#fde047' : warm ? '#fb923c' : '#475569';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${color}, ${lit ? '#f59e0b' : '#1e293b'})`,
          boxShadow: lit
            ? `0 0 ${60 * glow}px ${40 * glow}px #fbbf2488`
            : warm
              ? `0 0 30px #fb923c55`
              : 'inset 0 0 20px #0008',
          border: `4px solid ${lit || warm ? color : '#334155'}`,
        }}
      />
      <div
        style={{
          width: 36,
          height: 48,
          background: '#334155',
          borderRadius: '0 0 8px 8px',
        }}
      />
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: shortColors.muted,
          letterSpacing: '0.1em',
        }}
      >
        {lit ? 'ENCENDIDA' : warm ? 'CALIENTE' : 'APAGADA'}
      </div>
    </div>
  );
};

export const LogicRoom: React.FC<{
  visual: LogicRoomVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleIn = spring({frame, fps, config: {damping: 14, stiffness: 110}});
  const split = visual.layout === 'split-room';

  return (
    <AbsoluteFill
      style={{
        fontFamily: shortFont,
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <SfxAt name="pop" from={0} durationInFrames={16} volume={SFX_VOLUME.pop} />
      {onScreenText ? (
        <div
          style={{
            position: 'absolute',
            top: SAFE.top,
            left: SAFE.side,
            right: SAFE.side,
            textAlign: 'center',
            fontSize: 40,
            fontWeight: 800,
            color: shortColors.text,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.25,
            opacity: titleIn,
            transform: `scale(${interpolate(titleIn, [0, 1], [0.92, 1])})`,
          }}
        >
          {onScreenText}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexDirection: split ? 'row' : 'column',
          gap: 28,
          width: '100%',
          maxWidth: 960,
          marginTop: onScreenText ? 80 : 0,
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            flex: 1,
            background: shortColors.panel,
            borderRadius: 28,
            border: `2px solid ${shortColors.muted}44`,
            padding: 36,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 28,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: shortColors.accent,
            }}
          >
            INTERRUPTORES
          </div>
          <div style={{display: 'flex', gap: 28}}>
            {visual.switches.map((label, i) => (
              <SwitchPlate
                key={label}
                label={label}
                on={false}
                delay={Math.round(i * 4)}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            background: shortColors.panel,
            borderRadius: 28,
            border: `2px solid ${shortColors.muted}44`,
            padding: 36,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: shortColors.warn,
            }}
          >
            HABITACIÓN
          </div>
          <Bulb mode={visual.bulb} />
        </div>
      </div>

      {visual.showRuleCards ? (
        <div
          style={{
            position: 'absolute',
            bottom: SAFE.bottom + 40,
            left: SAFE.side,
            right: SAFE.side,
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
          }}
        >
          {['Interruptores: OK', 'Bombilla: NO ver'].map((card, i) => {
            const cardIn = spring({
              frame: frame - 8 - i * 6,
              fps,
              config: {damping: 14, stiffness: 120},
            });
            return (
              <div
                key={card}
                style={{
                  flex: 1,
                  maxWidth: 400,
                  padding: '20px 24px',
                  borderRadius: 18,
                  background: i === 0 ? '#0f3d2e' : '#3b1d1d',
                  border: `2px solid ${i === 0 ? shortColors.success : shortColors.danger}`,
                  color: shortColors.text,
                  fontSize: 26,
                  fontWeight: 700,
                  textAlign: 'center',
                  opacity: cardIn,
                  transform: `translateY(${interpolate(cardIn, [0, 1], [30, 0])}px)`,
                }}
              >
                {card}
              </div>
            );
          })}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
