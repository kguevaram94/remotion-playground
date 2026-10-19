import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {SwitchSequenceVisual} from '../../domain/scene.schema';
import {SAFE, shortColors, shortFont} from '../theme';
import {SfxAt} from './Sfx';

const ALL = ['A', 'B', 'C'] as const;

export const SwitchSequence: React.FC<{
  visual: SwitchSequenceVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const steps = visual.steps;
  const stepLen = Math.max(1, Math.floor(durationInFrames / steps.length));
  const stepIndex = Math.min(steps.length - 1, Math.floor(frame / stepLen));
  const local = frame - stepIndex * stepLen;
  const stepEnter = spring({
    frame: local,
    fps,
    config: {damping: 14, stiffness: 140},
  });

  const stateMap: Record<string, 'on' | 'off'> = {A: 'off', B: 'off', C: 'off'};
  for (let i = 0; i <= stepIndex; i++) {
    const s = steps[i]!;
    stateMap[s.switch] = s.state;
  }

  const current = steps[stepIndex]!;

  return (
    <AbsoluteFill
      style={{
        fontFamily: shortFont,
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {steps.map((_, i) => (
        <SfxAt
          key={`sw-${i}`}
          name="pop"
          from={i * stepLen}
          durationInFrames={12}
          volume={0.38}
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
            fontSize: 36,
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
          gap: 36,
          marginTop: 40,
        }}
      >
        {ALL.map((label) => {
          const on = stateMap[label] === 'on';
          const active = current.switch === label;
          return (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                transform: active
                  ? `scale(${interpolate(stepEnter, [0, 1], [1, 1.12])})`
                  : 'scale(1)',
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 160,
                  borderRadius: 18,
                  background: '#1e293b',
                  border: `4px solid ${
                    active
                      ? shortColors.accent
                      : on
                        ? shortColors.warn
                        : shortColors.muted
                  }`,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: on ? 86 : 16,
                  boxShadow: on ? `0 0 28px ${shortColors.warn}77` : 'none',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    background: on ? shortColors.warn : '#64748b',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: active ? shortColors.accent : shortColors.text,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: on ? shortColors.warn : shortColors.muted,
                  letterSpacing: '0.08em',
                }}
              >
                {on ? 'ON' : 'OFF'}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 48,
          padding: '16px 28px',
          borderRadius: 999,
          background: '#0f172a',
          border: `2px solid ${shortColors.accent}`,
          color: shortColors.text,
          fontSize: 28,
          fontWeight: 700,
          opacity: stepEnter,
        }}
      >
        Paso {stepIndex + 1}: {current.switch} →{' '}
        {current.state === 'on' ? 'ENCENDIDO' : 'APAGADO'}
      </div>
    </AbsoluteFill>
  );
};
