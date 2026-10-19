import {AbsoluteFill} from 'remotion';

/**
 * Optional Rive hook point.
 *
 * Rive is supported via `@remotion/rive` when you have `.riv` assets.
 * We intentionally do not hard-depend on it: puzzle Shorts are SVG/declarative
 * by default. Drop a file in `public/rive/<name>.riv` and wire RemotionRiveCanvas
 * here when needed.
 *
 * Install: `npm i @remotion/rive`
 * Docs: https://www.remotion.dev/docs/rive
 */
export const RiveOverlay: React.FC<{
  src?: string;
  label?: string;
}> = ({src, label}) => {
  if (!src) return null;
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
        opacity: 0.85,
      }}
    >
      <div
        style={{
          color: '#94a3b8',
          fontSize: 22,
          textAlign: 'center',
          padding: 24,
        }}
      >
        {label || 'Rive asset pendiente'}
        <div style={{fontSize: 16, marginTop: 8}}>{src}</div>
      </div>
    </AbsoluteFill>
  );
};
