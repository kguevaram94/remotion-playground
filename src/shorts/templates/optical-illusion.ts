import type {VideoScript} from '../domain/script.schema';
import {SCHEMA_VERSION} from '../config/defaults';

/**
 * Familia illusion — beat propio (entrega D):
 * hook → puzzle → countdown → explanation → reveal → outro (CTA comentar).
 * No usa la secuencia logic-lateral.
 */
export const ILLUSION_BEAT_SEQUENCE = [
  'hook',
  'puzzle',
  'countdown',
  'explanation',
  'reveal',
  'outro',
] as const;

const MUELLER_LYER_PUZZLE_SHAPES = [
  {id: 'a', kind: 'line' as const, x: 0.2, y: 0.35, size: 0.6, rotation: 0, color: '#f8fafc'},
  {id: 'b', kind: 'line' as const, x: 0.2, y: 0.55, size: 0.6, rotation: 0, color: '#f8fafc'},
  {id: 'a1', kind: 'arrow' as const, x: 0.2, y: 0.35, size: 0.08, rotation: -45, color: '#38bdf8'},
  {id: 'a2', kind: 'arrow' as const, x: 0.8, y: 0.35, size: 0.08, rotation: 225, color: '#38bdf8'},
  {id: 'b1', kind: 'arrow' as const, x: 0.2, y: 0.55, size: 0.08, rotation: 45, color: '#fbbf24'},
  {id: 'b2', kind: 'arrow' as const, x: 0.8, y: 0.55, size: 0.08, rotation: 135, color: '#fbbf24'},
];

const MUELLER_LYER_REVEAL_SHAPES = [
  {id: 'a', kind: 'line' as const, x: 0.2, y: 0.35, size: 0.6, rotation: 0, color: '#34d399'},
  {id: 'b', kind: 'line' as const, x: 0.2, y: 0.55, size: 0.6, rotation: 0, color: '#34d399'},
];

export const buildOpticalIllusionScript = (
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
      narration: '¿Cuál de estas dos líneas horizontales es más larga?',
      onScreenText: 'ILUSIÓN\n¿CUÁL ES MÁS LARGA?',
      durationSeconds: 3,
      transition: 'fade',
      subtitleText: '¿Cuál línea es más larga?',
      visual: {template: 'hook', badge: 'ILUSIÓN', emphasis: 'Müller-Lyer'},
    },
    {
      id: 'puzzle',
      type: 'puzzle',
      narration: 'Confía en tus ojos… o no. Observa las flechas.',
      onScreenText: 'OBSERVA',
      durationSeconds: 4,
      transition: 'zoom',
      subtitleText: 'Observa con atención',
      visual: {
        template: 'optical-illusion',
        illusionType: 'mueller-lyer',
        shapes: MUELLER_LYER_PUZZLE_SHAPES.map((s) => ({...s})),
        showGuides: false,
        compareMode: false,
      },
    },
    {
      id: 'countdown',
      type: 'countdown',
      narration: 'Decide ahora.',
      onScreenText: 'DECIDE',
      durationSeconds: 3,
      transition: 'none',
      subtitleText: 'Decide',
      visual: {template: 'countdown', seconds: 3, label: 'Decide'},
    },
    {
      id: 'explanation',
      type: 'explanation',
      narration: 'Las flechas cambian cómo percibes la longitud. Vamos a medir.',
      onScreenText: 'LAS FLECHAS ENGAÑAN',
      durationSeconds: 3.5,
      transition: 'fade',
      subtitleText: 'Las flechas engañan',
      visual: {
        template: 'text',
        headline: 'LAS FLECHAS ENGAÑAN',
        body: 'Misma geometría, distinta percepción',
      },
    },
    {
      id: 'reveal',
      type: 'reveal',
      narration:
        'Miden exactamente lo mismo. Las guías verticales alinean los extremos: misma longitud.',
      onScreenText: '¡IGUALES!',
      durationSeconds: 4.5,
      transition: 'fade',
      subtitleText: 'Las dos miden lo mismo',
      visual: {
        template: 'optical-illusion',
        illusionType: 'mueller-lyer',
        shapes: MUELLER_LYER_REVEAL_SHAPES.map((s) => ({...s})),
        showGuides: true,
        compareMode: true,
      },
    },
    {
      id: 'outro',
      type: 'outro',
      narration: '¿Te engañó la ilusión? Cuéntalo en los comentarios.',
      onScreenText: '¿TE ENGAÑÓ?',
      durationSeconds: 3,
      transition: 'fade',
      subtitleText: 'Comenta si te engañó',
      visual: {
        template: 'text',
        headline: '¿TE ENGAÑÓ?',
        body: 'Cuéntalo en los comentarios',
        accent: 'Deja tu respuesta abajo ↓',
      },
    },
  ];

  return {
    id,
    title,
    language: options.language,
    niche: 'optical-illusion',
    format: 'optical-illusion',
    family: 'illusion',
    targetDurationSeconds: options.targetDurationSeconds,
    aspectRatio: '9:16',
    fps: options.fps,
    resolution: {width: options.width, height: options.height},
    hook: '¿Cuál es más larga?',
    narration: scenes.map((s) => s.narration).join(' '),
    scenes,
    solution: {
      summary: 'Ambas líneas tienen la misma longitud.',
      explanation:
        'En la ilusión de Müller-Lyer, las flechas alteran la percepción aunque las longitudes geométricas sean idénticas (size=0.6 en ambas).',
      answerKey: {
        type: 'mueller-lyer',
        lengthsEqual: true,
        size: 0.6,
      },
      validationStatus: 'partial',
    },
    callToAction: '¿Te engañó? Cuéntalo en los comentarios.',
    sources: [
      'Ilusión de Müller-Lyer (propiedades geométricas declaradas en el visual).',
      'Plantilla oficial familia illusion (T-MULTIFORMAT-001 entrega D).',
    ],
    createdAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
};
