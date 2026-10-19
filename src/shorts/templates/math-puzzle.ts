import type {VideoScript} from '../domain/script.schema';
import {SCHEMA_VERSION} from '../config/defaults';

/**
 * Familia math — beat propio (entrega B):
 * hook → puzzle → countdown → explanation → reveal → outro (CTA comentar).
 * No usa la secuencia logic-lateral.
 */
export const MATH_BEAT_SEQUENCE = [
  'hook',
  'puzzle',
  'countdown',
  'explanation',
  'reveal',
  'outro',
] as const;

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
      narration: '¿Cuánto da esta operación? Sin calculadora.',
      onScreenText: 'MATEMÁTICAS\nSIN CALCULADORA',
      durationSeconds: 3,
      transition: 'zoom',
      subtitleText: 'Resuelve sin calculadora',
      visual: {
        template: 'hook',
        badge: 'MATEMÁTICAS',
        emphasis: 'Sin calculadora',
      },
    },
    {
      id: 'puzzle',
      type: 'puzzle',
      narration: 'Siete más cinco. ¿Cuál es el resultado?',
      onScreenText: '7 + 5 = ?',
      durationSeconds: 4,
      transition: 'fade',
      subtitleText: 'Siete más cinco',
      visual: {
        template: 'math-puzzle',
        expression: '7 + 5 = ?',
        operands: [7, 5],
        operator: '+',
        steps: [],
      },
    },
    {
      id: 'countdown',
      type: 'countdown',
      narration: 'Cinco segundos. Suma en voz alta.',
      onScreenText: '¿CUÁNTO ES?',
      durationSeconds: 5,
      transition: 'none',
      subtitleText: 'Cuenta atrás',
      visual: {template: 'countdown', seconds: 5, label: '¿Cuánto es?'},
    },
    {
      id: 'explanation',
      type: 'explanation',
      narration:
        'Siete más cinco es doce. Puedes contar cinco desde siete: ocho, nueve, diez, once, doce.',
      onScreenText: '7 → +5 → 12',
      durationSeconds: 4,
      transition: 'slide-up',
      subtitleText: 'Cuenta cinco desde siete',
      visual: {
        template: 'math-puzzle',
        expression: '7 + 5',
        operands: [7, 5],
        operator: '+',
        result: 12,
        steps: ['Parte de 7', 'Suma 5', 'Llegas a 12'],
      },
    },
    {
      id: 'reveal',
      type: 'reveal',
      narration: 'La respuesta es doce. Siete más cinco igual a doce.',
      onScreenText: '7 + 5 = 12',
      durationSeconds: 5,
      transition: 'fade',
      subtitleText: 'Respuesta: doce',
      visual: {
        template: 'math-puzzle',
        expression: '7 + 5 = ?',
        operands: [7, 5],
        operator: '+',
        result: 12,
        revealAnswer: '7+5=12',
        steps: ['7 + 5 = 12'],
      },
    },
    {
      id: 'outro',
      type: 'outro',
      narration: '¿Lo resolviste a tiempo? Cuéntalo en los comentarios.',
      onScreenText: '¿LO RESOLVISTE?',
      durationSeconds: 4,
      transition: 'fade',
      subtitleText: 'Comenta tu resultado',
      visual: {
        template: 'text',
        headline: '¿LO RESOLVISTE?',
        body: 'Cuéntalo en los comentarios',
        accent: 'Deja tu respuesta abajo ↓',
      },
    },
  ];

  return {
    id,
    title,
    language: options.language,
    niche: 'math',
    format: 'math-puzzle',
    family: 'math',
    targetDurationSeconds: options.targetDurationSeconds,
    aspectRatio: '9:16',
    fps: options.fps,
    resolution: {width: options.width, height: options.height},
    hook: 'Resuelve la operación antes de que acabe la cuenta atrás.',
    narration: scenes.map((s) => s.narration).join(' '),
    scenes,
    solution: {
      summary: '7 + 5 = 12',
      explanation: 'Suma de enteros: 7 + 5 produce 12.',
      answerKey: {
        type: 'math',
        equation: '7+5=12',
        left: 12,
        right: 12,
        result: 12,
        operands: [7, 5],
        operator: '+',
      },
      validationStatus: 'auto_validated',
    },
    callToAction: '¿Lo resolviste? Cuéntalo en los comentarios.',
    sources: [],
    createdAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
};
