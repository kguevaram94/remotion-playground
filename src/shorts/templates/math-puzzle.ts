import type {VideoScript} from '../domain/script.schema';
import {SCHEMA_VERSION} from '../config/defaults';

export const buildMathPuzzleScript = (
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
  const scenes: VideoScript['scenes'] = [
    {
      id: 'hook',
      type: 'hook',
      narration: 'Mueve una sola cerilla para que la ecuación sea correcta.',
      onScreenText: '1 cerilla · 1 ecuación',
      durationSeconds: 3,
      transition: 'fade',
      subtitleText: 'Corrige la ecuación con una cerilla',
      visual: {template: 'hook', badge: 'MATEMÁTICAS', emphasis: 'Una sola cerilla'},
    },
    {
      id: 'puzzle',
      type: 'puzzle',
      narration: 'Observa: VI igual a III más III. Algo no cuadra en números romanos con cerillas.',
      onScreenText: 'VI = III + III',
      durationSeconds: 4,
      transition: 'zoom',
      subtitleText: 'VI = III + III',
      visual: {
        template: 'math-puzzle',
        expression: 'VI = III + III',
        matchsticks: {
          before: ['V', 'I', 'eq', 'I', 'I', 'I', 'plus', 'I', 'I', 'I'],
          after: ['V', 'I', 'eq', 'I', 'I', 'I', 'plus', 'I', 'I', 'I'],
          moves: 1,
        },
        steps: [],
      },
    },
    {
      id: 'countdown',
      type: 'countdown',
      narration: 'Piensa qué cerilla mover.',
      onScreenText: 'Resuelve',
      durationSeconds: 4,
      transition: 'none',
      subtitleText: 'Cuenta atrás',
      visual: {template: 'countdown', seconds: 4, label: 'Resuelve'},
    },
    {
      id: 'reveal',
      type: 'reveal',
      narration:
        'Mueve una cerilla del primer número romano para formar un cuatro: IV igual a III más I.',
      onScreenText: 'IV = III + I',
      durationSeconds: 5,
      transition: 'fade',
      subtitleText: 'IV = III + I',
      visual: {
        template: 'math-puzzle',
        expression: 'IV = III + I',
        matchsticks: {
          before: ['V', 'I', 'eq', 'I', 'I', 'I', 'plus', 'I', 'I', 'I'],
          after: ['I', 'V', 'eq', 'I', 'I', 'I', 'plus', 'I', 'eq-pad'],
          moves: 1,
        },
        steps: ['Mueve una cerilla para formar IV = III + I'],
        revealAnswer: '4=3+1',
        result: 4,
        operands: [3, 1],
        operator: '+',
      },
    },
    {
      id: 'outro',
      type: 'outro',
      narration: '¿Se te ocurrió otra solución válida? Compártela.',
      onScreenText: '¿Otra solución?',
      durationSeconds: 2.2,
      transition: 'fade',
      subtitleText: '¿Se te ocurrió otra?',
      visual: {template: 'text', headline: '¿Otra solución?', body: 'Comenta abajo'},
    },
  ];

  return {
    id,
    title,
    language: options.language,
    niche: 'math',
    format: 'math-puzzle',
    targetDurationSeconds: options.targetDurationSeconds,
    aspectRatio: '9:16',
    fps: options.fps,
    resolution: {width: options.width, height: options.height},
    hook: 'Corrige la ecuación con una cerilla',
    narration: scenes.map((s) => s.narration).join(' '),
    scenes,
    solution: {
      summary: 'IV = III + I (4 = 3 + 1)',
      explanation:
        'Se mueve una cerilla para transformar VI en IV y ajustar el lado derecho a III + I.',
      answerKey: {type: 'math', equation: '4=3+1', left: 4, right: 4},
      validationStatus: 'auto_validated',
    },
    callToAction: 'Comparte tu solución.',
    sources: [],
    createdAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
};
