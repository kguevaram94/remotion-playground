import type {formatSchema} from '../domain/script.schema';
import type {z} from 'zod';
import {buildNineDotsScript} from './logic-puzzle';
import {
  buildThreeSwitchesScript,
  isThreeSwitchesTitle,
} from './three-switches';
import type {VideoScript} from '../domain/script.schema';
import {SCHEMA_VERSION} from '../config/defaults';
import {countSquaresInGrid} from '../domain/puzzle-validator';

export type Format = z.infer<typeof formatSchema>;

export const detectFormat = (title: string): Format => {
  const t = title.toLowerCase();
  if (/cerilla|ecuaci[oó]n|matem|suma|resta|n[uú]mero/.test(t)) {
    return 'math-puzzle';
  }
  if (/ilusi[oó]n|[oó]ptica|m[uü]ller|l[ií]neas/.test(t)) {
    return 'optical-illusion';
  }
  if (/memoria|recuerda|desaparec|secuencia/.test(t)) {
    return 'memory-challenge';
  }
  if (
    isThreeSwitchesTitle(title) ||
    /punto|dots|l[oó]gica|lateral|cuadrado|contar|cu[aá]ntos|interruptor|bombilla/.test(
      t,
    )
  ) {
    return 'logic-puzzle';
  }
  if (/diferente|distinto|odd one|encuentra/.test(t)) {
    return 'find-different';
  }
  return 'find-different';
};

export const buildLogicPuzzleFromTitle = (
  title: string,
  id: string,
  options: {
    language: string;
    fps: number;
    width: number;
    height: number;
    targetDurationSeconds: number;
  },
): VideoScript => {
  if (isThreeSwitchesTitle(title)) {
    return buildThreeSwitchesScript(title, id, options);
  }
  if (/9|nueve|puntos|dots/i.test(title)) {
    return buildNineDotsScript(title, id, options);
  }

  // Default: count squares in a 4×4 grid of unit cells
  const gridSize = 4;
  const count = countSquaresInGrid(gridSize);

  const scenes: VideoScript['scenes'] = [
    {
      id: 'hook',
      type: 'hook',
      narration: `¿Cuántos cuadrados hay en esta figura de ${gridSize} por ${gridSize}?`,
      onScreenText: '¿Cuántos cuadrados?',
      durationSeconds: 3,
      transition: 'fade',
      subtitleText: '¿Cuántos cuadrados puedes contar?',
      visual: {template: 'hook', badge: 'CUENTA', emphasis: `${gridSize}×${gridSize}`},
    },
    {
      id: 'puzzle',
      type: 'puzzle',
      narration: 'Cuenta con cuidado: los grandes también cuentan.',
      onScreenText: `${gridSize}×${gridSize}`,
      durationSeconds: 3,
      transition: 'zoom',
      subtitleText: 'Incluye los grandes',
      visual: {
        template: 'logic-puzzle',
        variant: 'custom',
        objects: Array.from({length: gridSize * gridSize}, (_, i) => ({
          id: `cell-${i}`,
          label: '□',
          x: (i % gridSize) / gridSize,
          y: Math.floor(i / gridSize) / gridSize,
        })),
        revealProgress: 0,
      },
    },
    {
      id: 'countdown',
      type: 'countdown',
      narration: 'Suma tu total.',
      onScreenText: 'Cuenta',
      durationSeconds: 5,
      transition: 'none',
      subtitleText: 'Cuenta atrás',
      visual: {template: 'countdown', seconds: 5, label: 'Cuenta'},
    },
    {
      id: 'reveal',
      type: 'reveal',
      narration: `Hay ${count} cuadrados en total.`,
      onScreenText: String(count),
      durationSeconds: 4,
      transition: 'fade',
      subtitleText: `Respuesta: ${count}`,
      visual: {
        template: 'text',
        headline: String(count),
        body: `Cuadrados de 1×1 hasta ${gridSize}×${gridSize}`,
      },
    },
    {
      id: 'explanation',
      type: 'explanation',
      narration: `La fórmula suma los cuadrados de cada tamaño: uno por uno hasta ${gridSize}.`,
      onScreenText: 'Suma por tamaños',
      durationSeconds: 3.5,
      transition: 'slide-up',
      subtitleText: 'Suma por tamaños',
      visual: {
        template: 'text',
        headline: 'Cómo se calcula',
        body: Array.from({length: gridSize}, (_, i) => {
          const size = i + 1;
          const n = (gridSize - size + 1) ** 2;
          return `${size}×${size}: ${n}`;
        }).join(' · '),
      },
    },
    {
      id: 'outro',
      type: 'outro',
      narration: '¿Acertaste el número? Comenta.',
      onScreenText: '¿Acertaste?',
      durationSeconds: 2,
      transition: 'fade',
      subtitleText: '¿Acertaste?',
      visual: {template: 'text', headline: '¿Acertaste?', body: 'Comenta tu número'},
    },
  ];

  return {
    id,
    title,
    language: options.language,
    niche: 'logic',
    format: 'logic-puzzle',
    targetDurationSeconds: options.targetDurationSeconds,
    aspectRatio: '9:16',
    fps: options.fps,
    resolution: {width: options.width, height: options.height},
    hook: '¿Cuántos cuadrados?',
    narration: scenes.map((s) => s.narration).join(' '),
    scenes,
    solution: {
      summary: `${count} cuadrados en una cuadrícula ${gridSize}×${gridSize}.`,
      explanation: `Se suman (n-k+1)² para k=1..n con n=${gridSize}.`,
      answerKey: {type: 'count-squares', gridSize, count},
      validationStatus: 'auto_validated',
    },
    callToAction: '¿Acertaste? Comenta.',
    sources: [],
    createdAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
};
