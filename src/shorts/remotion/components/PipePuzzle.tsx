import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {
  PipeFillVisual,
  PipePuzzleVisual,
  PipeTraceVisual,
} from '../../domain/scene.schema';
import {SAFE, shortColors, shortFont} from '../theme';
import {SfxAt} from './Sfx';

/**
 * Pedagogical pipe diagram (not a thin stroke maze).
 * Water story: inlet → try A (blocked) → try B (blocked) → down to C.
 */
const VB = {w: 720, h: 560};
const J = {x: 360, y: 210}; // junction
const INLET = {x: 360, y: 48};
const END_A = {x: 130, y: 210};
const END_B = {x: 590, y: 210};
const END_C = {x: 360, y: 390};

const PATH_INLET = `M ${INLET.x} ${INLET.y} L ${J.x} ${J.y}`;
const PATH_A = `M ${J.x} ${J.y} L ${END_A.x} ${END_A.y}`;
const PATH_B = `M ${J.x} ${J.y} L ${END_B.x} ${END_B.y}`;
const PATH_C = `M ${J.x} ${J.y} L ${END_C.x} ${END_C.y}`;
const PATH_OPEN = `M ${INLET.x} ${INLET.y} L ${J.x} ${J.y} L ${END_C.x} ${END_C.y}`;

const LEN_INLET = getLength(PATH_INLET);
const LEN_C = getLength(PATH_C);
const LEN_OPEN = getLength(PATH_OPEN);

const PIPE_OUTER = 46;
const PIPE_INNER = 30;

type StoryPhase =
  | 'idle'
  | 'rules'
  | 'down'
  | 'tryA'
  | 'rejectA'
  | 'tryB'
  | 'rejectB'
  | 'toC'
  | 'fillC';

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
        zIndex: 3,
        lineHeight: 1.2,
      }}
    >
      {text}
    </div>
  ) : null;

const StatusBadge: React.FC<{
  label: string;
  tone: 'ok' | 'bad' | 'neutral';
  opacity?: number;
}> = ({label, tone, opacity = 1}) => {
  const bg =
    tone === 'ok' ? '#14532d' : tone === 'bad' ? '#7f1d1d' : '#1e293b';
  const fg =
    tone === 'ok'
      ? shortColors.success
      : tone === 'bad'
        ? shortColors.danger
        : shortColors.muted;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: SAFE.bottom + 36,
        left: SAFE.side,
        right: SAFE.side,
        textAlign: 'center',
        opacity,
        zIndex: 3,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          padding: '10px 22px',
          borderRadius: 999,
          background: bg,
          color: fg,
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </span>
    </div>
  );
};

const Glass: React.FC<{
  label: string;
  x: number;
  y: number;
  blocked?: boolean;
  fill?: number;
  active?: boolean;
}> = ({label, x, y, blocked, fill = 0, active}) => {
  const stroke = active
    ? shortColors.success
    : blocked
      ? shortColors.danger
      : '#64748b';
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={-48}
        y={0}
        width={96}
        height={120}
        rx={12}
        ry={20}
        fill="#0b1220"
        stroke={stroke}
        strokeWidth={5}
      />
      <rect
        x={-42}
        y={120 - Math.max(0, Math.min(1, fill)) * 108}
        width={84}
        height={Math.max(0, Math.min(1, fill)) * 108}
        rx={8}
        fill="url(#waterGrad)"
      />
      {blocked ? (
        <>
          <line
            x1={-34}
            y1={22}
            x2={34}
            y2={98}
            stroke={shortColors.danger}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <line
            x1={34}
            y1={22}
            x2={-34}
            y2={98}
            stroke={shortColors.danger}
            strokeWidth={7}
            strokeLinecap="round"
          />
        </>
      ) : null}
      <text
        x={0}
        y={152}
        textAnchor="middle"
        fill={shortColors.text}
        fontSize={36}
        fontWeight={800}
        fontFamily={shortFont}
      >
        {label}
      </text>
    </g>
  );
};

/** Capsule pipe body + optional water fill along a straight segment. */
const PipeSeg: React.FC<{
  d: string;
  water: number;
  blockedTone?: boolean;
  openTone?: boolean;
}> = ({d, water, blockedTone, openTone}) => {
  const evolved = evolvePath(Math.max(0, Math.min(1, water)), d);
  const body =
    blockedTone ? '#6b1d1d' : openTone ? '#0c4a6e' : '#475569';
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="#1e293b"
        strokeWidth={PIPE_OUTER + 8}
        strokeLinecap="round"
      />
      <path
        d={d}
        fill="none"
        stroke={body}
        strokeWidth={PIPE_OUTER}
        strokeLinecap="round"
      />
      <path
        d={d}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={PIPE_INNER}
        strokeLinecap="round"
        opacity={0.35}
      />
      {water > 0.001 ? (
        <path
          d={d}
          fill="none"
          stroke="url(#waterGrad)"
          strokeWidth={PIPE_INNER - 4}
          strokeLinecap="round"
          strokeDasharray={evolved.strokeDasharray}
          strokeDashoffset={evolved.strokeDashoffset}
        />
      ) : null}
    </g>
  );
};

const Cap: React.FC<{x: number; y: number; show: boolean; pulse?: number}> = ({
  x,
  y,
  show,
  pulse = 1,
}) => {
  if (!show) return null;
  const s = 0.9 + pulse * 0.15;
  return (
    <g transform={`translate(${x}, ${y}) scale(${s})`}>
      <circle r={28} fill="#450a0a" stroke={shortColors.danger} strokeWidth={4} />
      <text
        y={10}
        textAnchor="middle"
        fill={shortColors.danger}
        fontSize={28}
        fontWeight={900}
        fontFamily={shortFont}
      >
        ✕
      </text>
    </g>
  );
};

const WaterHead: React.FC<{path: string; t: number; visible: boolean}> = ({
  path,
  t,
  visible,
}) => {
  if (!visible || t <= 0) return null;
  const len = getLength(path);
  const pt = getPointAtLength(path, Math.min(len, Math.max(0, t) * len));
  if (!pt) return null;
  return (
    <g>
      {[0.12, 0.22, 0.32].map((back, i) => {
        const tb = Math.max(0, t - back);
        const p = getPointAtLength(path, tb * len);
        if (!p) return null;
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={10 - i * 2}
            fill="#38bdf8"
            opacity={0.35 - i * 0.08}
          />
        );
      })}
      <circle cx={pt.x} cy={pt.y} r={14} fill="#7dd3fc" stroke="#e0f2fe" strokeWidth={3} />
      <circle cx={pt.x - 3} cy={pt.y - 4} r={4} fill="#fff" opacity={0.55} />
    </g>
  );
};

type SegFills = {inlet: number; a: number; b: number; c: number};

const openPathFills = (pathT: number): SegFills => {
  const dist = Math.max(0, Math.min(1, pathT)) * LEN_OPEN;
  return {
    inlet: Math.min(1, dist / LEN_INLET),
    a: 0,
    b: 0,
    c: dist <= LEN_INLET ? 0 : Math.min(1, (dist - LEN_INLET) / LEN_C),
  };
};

const fillsForPhase = (
  phase: StoryPhase,
  localT: number,
): {segs: SegFills; headPath: string; headT: number; showHead: boolean} => {
  const t = Math.max(0, Math.min(1, localT));
  switch (phase) {
    case 'idle':
      return {
        segs: {inlet: 0.25, a: 0, b: 0, c: 0},
        headPath: PATH_INLET,
        headT: 0.25,
        showHead: true,
      };
    case 'rules':
      return {
        segs: {inlet: 0, a: 0, b: 0, c: 0},
        headPath: PATH_INLET,
        headT: 0,
        showHead: false,
      };
    case 'down':
      return {
        segs: {inlet: t, a: 0, b: 0, c: 0},
        headPath: PATH_INLET,
        headT: t,
        showHead: true,
      };
    case 'tryA':
      return {
        segs: {inlet: 1, a: t, b: 0, c: 0},
        headPath: PATH_A,
        headT: t,
        showHead: true,
      };
    case 'rejectA':
      return {
        segs: {inlet: 1, a: Math.max(0, 1 - t), b: 0, c: 0},
        headPath: PATH_A,
        headT: Math.max(0, 1 - t),
        showHead: t < 0.95,
      };
    case 'tryB':
      return {
        segs: {inlet: 1, a: 0, b: t, c: 0},
        headPath: PATH_B,
        headT: t,
        showHead: true,
      };
    case 'rejectB':
      return {
        segs: {inlet: 1, a: 0, b: Math.max(0, 1 - t), c: 0},
        headPath: PATH_B,
        headT: Math.max(0, 1 - t),
        showHead: t < 0.95,
      };
    case 'toC':
      return {
        segs: {inlet: 1, a: 0, b: 0, c: t},
        headPath: PATH_C,
        headT: t,
        showHead: true,
      };
    case 'fillC':
      return {
        segs: openPathFills(t),
        headPath: PATH_OPEN,
        headT: Math.min(1, t),
        showHead: t < 0.98,
      };
    default:
      return {
        segs: {inlet: 0, a: 0, b: 0, c: 0},
        headPath: PATH_INLET,
        headT: 0,
        showHead: false,
      };
  }
};

const PipeDiagram: React.FC<{
  phase: StoryPhase;
  localT: number;
  glassFill: number;
  showCaps: boolean;
}> = ({phase, localT, glassFill, showCaps}) => {
  const pulse = 0.5 + 0.5 * Math.sin(localT * Math.PI * 4);
  let segs: SegFills;
  let headPath: string;
  let headT: number;
  let showHead: boolean;

  if (phase === 'fillC') {
    const pathT = Math.min(1, localT / 0.42);
    segs = openPathFills(pathT);
    headPath = PATH_OPEN;
    headT = pathT;
    showHead = pathT < 0.99;
  } else {
    const f = fillsForPhase(phase, localT);
    segs = f.segs;
    headPath = f.headPath;
    headT = f.headT;
    showHead = f.showHead;
  }

  const highlightC = phase === 'toC' || phase === 'fillC' || glassFill > 0.05;
  const rejectPulse = phase === 'rejectA' || phase === 'rejectB' ? pulse : 1;

  return (
    <svg width={VB.w} height={VB.h} viewBox={`0 0 ${VB.w} ${VB.h}`}>
      <defs>
        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      {/* Faucet */}
      <rect x={318} y={8} width={84} height={40} rx={10} fill="#334155" stroke="#cbd5e1" strokeWidth={3} />
      <rect x={342} y={40} width={36} height={16} fill="#475569" />
      <text
        x={360}
        y={36}
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize={18}
        fontWeight={800}
        fontFamily={shortFont}
      >
        AGUA
      </text>

      <PipeSeg d={PATH_INLET} water={segs.inlet} openTone={segs.inlet > 0.05} />
      <PipeSeg
        d={PATH_A}
        water={segs.a}
        blockedTone
        openTone={false}
      />
      <PipeSeg d={PATH_B} water={segs.b} blockedTone openTone={false} />
      <PipeSeg d={PATH_C} water={segs.c} openTone={highlightC} />

      {/* Junction hub */}
      <circle
        cx={J.x}
        cy={J.y}
        r={32}
        fill="#1e293b"
        stroke={highlightC ? '#38bdf8' : '#94a3b8'}
        strokeWidth={5}
      />
      <circle cx={J.x} cy={J.y} r={12} fill={segs.inlet > 0.9 ? '#38bdf8' : '#64748b'} />

      <Cap x={END_A.x + 36} y={END_A.y} show={showCaps} pulse={phase === 'rejectA' ? rejectPulse : 1} />
      <Cap x={END_B.x - 36} y={END_B.y} show={showCaps} pulse={phase === 'rejectB' ? rejectPulse : 1} />

      {/* Arrow hints on open path */}
      {highlightC ? (
        <polygon
          points={`${J.x - 14},${J.y + 48} ${J.x + 14},${J.y + 48} ${J.x},${J.y + 72}`}
          fill="#38bdf8"
          opacity={0.85}
        />
      ) : null}

      <WaterHead path={headPath} t={headT} visible={showHead} />

      <Glass
        label="A"
        x={END_A.x}
        y={END_A.y + 40}
        blocked={showCaps}
      />
      <Glass
        label="B"
        x={END_B.x}
        y={END_B.y + 40}
        blocked={showCaps}
      />
      <Glass
        label="C"
        x={END_C.x}
        y={END_C.y + 8}
        fill={glassFill}
        active={glassFill > 0.08 || phase === 'fillC' || phase === 'toC'}
      />
    </svg>
  );
};

function badgeForPhase(phase: StoryPhase): {label: string; tone: 'ok' | 'bad' | 'neutral'} | null {
  switch (phase) {
    case 'down':
      return {label: 'ENTRA POR ARRIBA', tone: 'neutral'};
    case 'tryA':
      return {label: '¿HACIA A…?', tone: 'neutral'};
    case 'rejectA':
      return {label: 'A BLOQUEADA', tone: 'bad'};
    case 'tryB':
      return {label: '¿HACIA B…?', tone: 'neutral'};
    case 'rejectB':
      return {label: 'B BLOQUEADA', tone: 'bad'};
    case 'toC':
      return {label: 'SOLO C ESTÁ ABIERTA', tone: 'ok'};
    case 'fillC':
      return {label: 'SE LLENA C', tone: 'ok'};
    case 'rules':
      return {label: '✕ = NO PASA EL AGUA', tone: 'bad'};
    default:
      return null;
  }
}

/** Map 0–1 progress across a story beat timeline. */
function storyAt(progress: number): {phase: StoryPhase; localT: number} {
  const beats: {phase: StoryPhase; w: number}[] = [
    {phase: 'down', w: 0.14},
    {phase: 'tryA', w: 0.14},
    {phase: 'rejectA', w: 0.12},
    {phase: 'tryB', w: 0.14},
    {phase: 'rejectB', w: 0.12},
    {phase: 'toC', w: 0.18},
    {phase: 'fillC', w: 0.16},
  ];
  const total = beats.reduce((s, b) => s + b.w, 0);
  let p = Math.max(0, Math.min(1, progress)) * total;
  for (const b of beats) {
    if (p <= b.w) return {phase: b.phase, localT: p / b.w};
    p -= b.w;
  }
  return {phase: 'fillC', localT: 1};
}

export const PipePuzzleScene: React.FC<{
  visual: PipePuzzleVisual;
  onScreenText?: string;
}> = ({visual, onScreenText}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 14, stiffness: 120}});
  const showCaps =
    visual.showBlockedEnds ||
    visual.blockedEdges.some((e) => /A|B/i.test(e));
  const isRules = visual.highlightMode === 'connections';
  const drip = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const phase: StoryPhase = isRules ? 'rules' : 'idle';
  const badge = badgeForPhase(phase);

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
          marginTop: 40,
          opacity: enter,
          transform: `scale(${interpolate(enter, [0, 1], [0.94, 1])})`,
        }}
      >
        <PipeDiagram
          phase={phase}
          localT={isRules ? 1 : drip}
          glassFill={0}
          showCaps={showCaps || isRules}
        />
      </div>
      {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
    </AbsoluteFill>
  );
};

export const PipeTraceScene: React.FC<{
  visual: PipeTraceVisual;
  onScreenText?: string;
  durationInFrames?: number;
}> = ({visual, onScreenText, durationInFrames: sequenceFrames}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames: configFrames} = useVideoConfig();
  const durationInFrames =
    sequenceFrames && sequenceFrames > 0 ? sequenceFrames : configFrames;
  // Trace stops before full fill — story through toC
  const progress = interpolate(
    frame,
    [0, Math.max(24, durationInFrames - 2)],
    [0, 0.84],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const {phase, localT} = storyAt(progress);
  const badge = badgeForPhase(phase);
  void visual;

  const rejectAFrame = Math.floor(durationInFrames * 0.28);
  const rejectBFrame = Math.floor(durationInFrames * 0.54);

  return (
    <AbsoluteFill
      style={{
        fontFamily: shortFont,
        justifyContent: 'center',
        alignItems: 'center',
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
      }}
    >
      <SfxAt name="whoosh" from={0} durationInFrames={Math.round(0.3 * fps)} volume={0.36} />
      <SfxAt name="tick" from={rejectAFrame} durationInFrames={Math.round(0.2 * fps)} volume={0.4} />
      <SfxAt name="tick" from={rejectBFrame} durationInFrames={Math.round(0.2 * fps)} volume={0.4} />
      <Title text={onScreenText} />
      <div style={{marginTop: 40}}>
        <PipeDiagram
          phase={phase}
          localT={localT}
          glassFill={0}
          showCaps
        />
      </div>
      {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
    </AbsoluteFill>
  );
};

export const PipeFillScene: React.FC<{
  visual: PipeFillVisual;
  onScreenText?: string;
  durationInFrames?: number;
}> = ({visual, onScreenText, durationInFrames: sequenceFrames}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames: configFrames} = useVideoConfig();
  const durationInFrames =
    sequenceFrames && sequenceFrames > 0 ? sequenceFrames : configFrames;
  const pathEnd = Math.max(16, Math.floor(durationInFrames * 0.4));
  const pathT = interpolate(frame, [0, pathEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fill = interpolate(
    frame,
    [pathEnd, durationInFrames - 4],
    [visual.fillFrom, visual.fillTo],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  // localT: 0–0.42 path, then fill driven separately via glassFill
  const localT = interpolate(frame, [0, durationInFrames - 2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  void pathT;

  return (
    <AbsoluteFill
      style={{
        fontFamily: shortFont,
        justifyContent: 'center',
        alignItems: 'center',
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
      }}
    >
      <SfxAt name="ding" from={pathEnd} durationInFrames={Math.round(0.45 * fps)} volume={0.4} />
      <Title text={onScreenText} />
      <div style={{marginTop: 40}}>
        <PipeDiagram
          phase="fillC"
          localT={localT}
          glassFill={fill}
          showCaps
        />
      </div>
      <StatusBadge
        label={fill > 0.5 ? 'RESPUESTA: VASO C' : 'ÚNICA RUTA ABIERTA → C'}
        tone="ok"
      />
    </AbsoluteFill>
  );
};
