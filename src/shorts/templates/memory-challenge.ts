import type {VideoScript} from '../domain/script.schema';
import {SCHEMA_VERSION} from '../config/defaults';

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
  const items = [
    {id: 'a', symbol: '▲', color: '#38bdf8'},
    {id: 'b', symbol: '●', color: '#fbbf24'},
    {id: 'c', symbol: '■', color: '#34d399'},
    {id: 'd', symbol: '★', color: '#fb7185'},
  ];
  const missingId = 'c';

  const scenes: VideoScript['scenes'] = [
    {
      id: 'hook',
      type: 'hook',
      narration: 'Memoriza estos símbolos. Uno desaparecerá.',
      onScreenText: 'Desafío de memoria',
      durationSeconds: 2.5,
      transition: 'fade',
      subtitleText: 'Memoriza los símbolos',
      visual: {template: 'hook', badge: 'MEMORIA', emphasis: 'Uno desaparecerá'},
    },
    {
      id: 'puzzle',
      type: 'puzzle',
      narration: 'Presta atención a forma y color.',
      onScreenText: 'Memoriza',
      durationSeconds: 4,
      transition: 'zoom',
      subtitleText: 'Memoriza',
      visual: {
        template: 'memory-challenge',
        items,
        phase: 'show',
      },
    },
    {
      id: 'countdown',
      type: 'countdown',
      narration: 'Se ocultan…',
      onScreenText: 'Ocultos',
      durationSeconds: 2.5,
      transition: 'none',
      subtitleText: 'Se ocultan',
      visual: {
        template: 'memory-challenge',
        items,
        phase: 'hide',
      },
    },
    {
      id: 'hint',
      type: 'hint',
      narration: '¿Cuál falta?',
      onScreenText: '¿Cuál falta?',
      durationSeconds: 3,
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
      onScreenText: '■ verde',
      durationSeconds: 3.5,
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
      narration: '¿Acertaste? Dilo en comentarios.',
      onScreenText: '¿Acertaste?',
      durationSeconds: 2,
      transition: 'fade',
      subtitleText: '¿Acertaste?',
      visual: {template: 'text', headline: '¿Acertaste?', body: 'Comenta'},
    },
  ];

  return {
    id,
    title,
    language: options.language,
    niche: 'memory',
    format: 'memory-challenge',
    targetDurationSeconds: options.targetDurationSeconds,
    aspectRatio: '9:16',
    fps: options.fps,
    resolution: {width: options.width, height: options.height},
    hook: 'Desafío de memoria',
    narration: scenes.map((s) => s.narration).join(' '),
    scenes,
    solution: {
      summary: 'Faltaba el cuadrado verde (id c).',
      explanation: 'Tras ocultar los símbolos, el elemento ausente es el cuadrado verde.',
      answerKey: {type: 'memory', missingId},
      validationStatus: 'auto_validated',
    },
    callToAction: '¿Acertaste? Comenta.',
    sources: [],
    createdAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
};
