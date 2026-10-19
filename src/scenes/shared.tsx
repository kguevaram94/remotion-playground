import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export const font =
  'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

export const colors = {
  bg: '#07111f',
  panel: 'rgba(15, 23, 42, 0.88)',
  text: '#f8fafc',
  muted: '#94a3b8',
  confirm: '#34d399',
  contradict: '#fb7185',
  accent: '#38bdf8',
  warn: '#fbbf24',
};

export const useEnter = (delay = 0) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: {damping: 16, stiffness: 120},
  });
};

export const FadeSlide: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({children, delay = 0, style}) => {
  const enter = useEnter(delay);
  return (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [36, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const SceneShell: React.FC<{
  children: React.ReactNode;
  label?: string;
  character?: React.ReactNode;
}> = ({children, label, character}) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '72px 56px 280px',
        fontFamily: font,
        color: colors.text,
      }}
    >
      {label ? (
        <FadeSlide>
          <div
            style={{
              fontSize: 22,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: colors.accent,
              fontWeight: 700,
              marginBottom: 28,
            }}
          >
            {label}
          </div>
        </FadeSlide>
      ) : null}
      <div style={{flexShrink: 0}}>{children}</div>
      {character ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            minHeight: 0,
            paddingBottom: 8,
          }}
        >
          {character}
        </div>
      ) : null}
    </div>
  );
};

export const Card: React.FC<{
  children: React.ReactNode;
  accent?: string;
  style?: React.CSSProperties;
}> = ({children, accent = colors.accent, style}) => (
  <div
    style={{
      background: colors.panel,
      border: `2px solid ${accent}33`,
      boxShadow: `0 18px 50px rgba(0,0,0,0.35), inset 0 1px 0 ${accent}22`,
      borderRadius: 28,
      padding: '28px 30px',
      ...style,
    }}
  >
    {children}
  </div>
);
