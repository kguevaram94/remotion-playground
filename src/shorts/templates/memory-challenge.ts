import type {VideoScript} from '../domain/script.schema';
import {SCHEMA_VERSION} from '../config/defaults';

/**
 * Familia memory — beat propio (entrega C):
 * hook → puzzle → countdown → hint → reveal → outro (CTA comentar).
 * No usa la secuencia logic-lateral.
 */
export const MEMORY_BEAT_SEQUENCE = [
  'hook',
  'puzzle',
  'countdown',
  'hint',
  'reveal',
  'outro',
] as const;

const DEFAULT_ITEMS = [
  {id: 'a', symbol: '▲', color: '#38bdf8'},
  {id: 'b', symbol: '●', color: '#fbbf24'},
  {id: 'c', symbol: '■', color: '#34d399'},
  {id: 'd', symbol: '★', color: '#fb7185'},
] as const;

export const buildMemoryChallengeScript = (
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
  const items = DEFAULT_ITEMS.map((i) => ({...i}));
  const missingId = 'c';
  const missing = items.find((i) => i.id === missingId)!;

  const scenes: VideoScript['scenes'] = [
    {
      id: 'hook',
      type: 'hook',
      narration: 'Memoriza estos cuatro símbolos. Uno va a desaparecer.',
      onScreenText: 'MEMORIA\nUNO DESAPARECE',
      durationSeconds: 3,
      transition: 'zoom',
      subtitleText: 'Memoriza: uno desaparece',
      visual: {
        template: 'hook',
        badge: 'MEMORIA',
        emphasis: 'Uno desaparecerá',
      },
    },
    {
      id: 'puzzle',
      type: 'puzzle',
      narration:
        'Mira bien forma y color: triángulo azul, círculo amarillo, cuadrado verde y estrella rosa.',
      onScreenText: 'MEMORIZA',
      durationSeconds: 5,
      transition: 'fade',
      subtitleText: 'Forma y color',
      visual: {
        template: 'memory-challenge',
        items,
        phase: 'show',
      },
    },
    {
      id: 'countdown',
      type: 'countdown',
      narration: 'Se ocultan. Guarda la imagen en la mente.',
      onScreenText: 'OCULTOS',
      durationSeconds: 3,
      transition: 'none',
      subtitleText: 'Se ocultan',
      visual: {
        template: 'memory-challenge',
        items,
        phase: 'hide',
      },
    },
    {
      id: 'ask',
      type: 'hint',
      narration: '¿Cuál falta? Solo quedan tres.',
      onScreenText: '¿CUÁL FALTA?',
      durationSeconds: 4,
      transition: 'fade',
      subtitleText: '¿Cuál falta?',
      visual: {
        template: 'memory-challenge',
        items: items.filter((i) => i.id !== missingId),
        missingId,
        phase: 'ask',
      },
    },
    {
      id: 'reveal',
      type: 'reveal',
      narration: 'Faltaba el cuadrado verde.',
      onScreenText: '■ VERDE',
      durationSeconds: 5,
      transition: 'fade',
      subtitleText: 'El cuadrado verde',
      visual: {
        template: 'memory-challenge',
        items,
        missingId,
        phase: 'reveal',
      },
    },
    {
      id: 'outro',
      type: 'outro',
      narration: '¿Lo recordaste? Cuéntalo en los comentarios.',
      onScreenText: '¿LO RECORDISTE?',
      durationSeconds: 4,
      transition: 'fade',
      subtitleText: 'Comenta si acertaste',
      visual: {
        template: 'text',
        headline: '¿LO RECORDISTE?',
        body: 'Cuéntalo en los comentarios',
        accent: 'Deja tu respuesta abajo ↓',
      },
    },
  ];

  return {
    id,
    title,
    language: options.language,
    niche: 'memory',
    format: 'memory-challenge',
    family: 'memory',
    targetDurationSeconds: options.targetDurationSeconds,
    aspectRatio: '9:16',
    fps: options.fps,
    resolution: {width: options.width, height: options.height},
    hook: 'Memoriza los símbolos. Uno desaparecerá.',
    narration: scenes.map((s) => s.narration).join(' '),
    scenes,
    solution: {
      summary: `Faltaba el cuadrado verde (id ${missingId}).`,
      explanation:
        'Tras ocultar los símbolos, el elemento ausente es el cuadrado verde.',
      answerKey: {
        type: 'memory',
        missingId,
        symbol: missing.symbol,
        color: missing.color,
      },
      validationStatus: 'auto_validated',
    },
    callToAction: '¿Lo recordaste? Cuéntalo en los comentarios.',
    sources: [],
    createdAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
};
