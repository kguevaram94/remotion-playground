import type {VideoScript} from '../domain/script.schema';
import {SCHEMA_VERSION} from '../config/defaults';

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const buildFindDifferentGrid = (seed: number, rows = 3, cols = 3) => {
  const rand = mulberry32(seed);
  const answerIndex = Math.floor(rand() * rows * cols);
  const baseColor = '#38bdf8';
  const oddColor = '#fbbf24';
  const cells = Array.from({length: rows * cols}, (_, i) => {
    const isDifferent = i === answerIndex;
    return {
      id: `c${i}`,
      label: isDifferent ? '★' : '●',
      isDifferent,
      color: isDifferent ? oddColor : baseColor,
      shape: isDifferent ? ('star' as const) : ('circle' as const),
    };
  });
  return {
    rows,
    cols,
    seed,
    cells,
    answerCellId: `c${answerIndex}`,
    highlightProgress: 0 as number,
    template: 'find-different' as const,
  };
};

export const buildFindDifferentScript = (
  title: string,
  id: string,
  options: {
    language: string;
    fps: number;
    width: number;
    height: number;
    targetDurationSeconds: number;
    seed?: number;
  },
): VideoScript => {
  const seed = options.seed ?? 42;
  const grid = buildFindDifferentGrid(seed);

  const scenes: VideoScript['scenes'] = [
    {
      id: 'hook',
      type: 'hook',
      narration: 'Uno de estos elementos no pertenece al grupo. ¿Cuál es?',
      onScreenText: 'Encuentra el diferente',
      durationSeconds: 2.8,
      transition: 'fade',
      subtitleText: 'Encuentra el diferente',
      visual: {template: 'hook', badge: 'ATENCIÓN', emphasis: 'Solo uno es distinto'},
    },
    {
      id: 'puzzle',
      type: 'puzzle',
      narration: 'Mira la cuadrícula con atención.',
      onScreenText: '¿Cuál no encaja?',
      durationSeconds: 3,
      transition: 'zoom',
      subtitleText: 'Observa la cuadrícula',
      visual: {...grid, highlightProgress: 0},
    },
    {
      id: 'countdown',
      type: 'countdown',
      narration: 'Tic tac. Elige uno.',
      onScreenText: 'Elige',
      durationSeconds: 4,
      transition: 'none',
      subtitleText: 'Cuenta atrás',
      visual: {template: 'countdown', seconds: 4, label: 'Elige'},
    },
    {
      id: 'reveal',
      type: 'reveal',
      narration: 'La estrella amarilla es la distinta. El resto son círculos azules.',
      onScreenText: '¡Esta!',
      durationSeconds: 4,
      transition: 'fade',
      subtitleText: 'La estrella es la distinta',
      visual: {...grid, highlightProgress: 1},
    },
    {
      id: 'outro',
      type: 'outro',
      narration: '¿Lo viste a tiempo? Déjalo en comentarios.',
      onScreenText: '¿Lo viste?',
      durationSeconds: 2.2,
      transition: 'fade',
      subtitleText: 'Comenta si lo viste',
      visual: {template: 'text', headline: '¿Lo viste?', body: 'Comenta tu respuesta'},
    },
  ];

  return {
    id,
    title,
    language: options.language,
    niche: 'puzzles',
    format: 'find-different',
    targetDurationSeconds: options.targetDurationSeconds,
    aspectRatio: '9:16',
    fps: options.fps,
    resolution: {width: options.width, height: options.height},
    hook: 'Encuentra el diferente',
    narration: scenes.map((s) => s.narration).join(' '),
    scenes,
    solution: {
      summary: `La celda ${grid.answerCellId} es la distinta.`,
      explanation: 'Todos los elementos son círculos azules excepto una estrella amarilla.',
      answerKey: {type: 'find-different', answerCellId: grid.answerCellId, seed},
      validationStatus: 'auto_validated',
    },
    callToAction: '¿Lo viste? Comenta.',
    sources: [],
    createdAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
};
