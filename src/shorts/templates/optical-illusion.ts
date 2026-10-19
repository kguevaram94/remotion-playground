import type {VideoScript} from '../domain/script.schema';
import {SCHEMA_VERSION} from '../config/defaults';

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
      onScreenText: '¿Cuál es más larga?',
      durationSeconds: 3,
      transition: 'fade',
      subtitleText: '¿Cuál línea es más larga?',
      visual: {template: 'hook', badge: 'ILUSIÓN', emphasis: 'Müller-Lyer'},
    },
    {
      id: 'puzzle',
      type: 'puzzle',
      narration: 'Confía en tus ojos… o no.',
      onScreenText: 'Observa',
      durationSeconds: 4,
      transition: 'zoom',
      subtitleText: 'Observa con atención',
      visual: {
        template: 'optical-illusion',
        illusionType: 'mueller-lyer',
        shapes: [
          {id: 'a', kind: 'line', x: 0.2, y: 0.35, size: 0.6, rotation: 0, color: '#f8fafc'},
          {id: 'b', kind: 'line', x: 0.2, y: 0.55, size: 0.6, rotation: 0, color: '#f8fafc'},
          {id: 'a1', kind: 'arrow', x: 0.2, y: 0.35, size: 0.08, rotation: -45, color: '#38bdf8'},
          {id: 'a2', kind: 'arrow', x: 0.8, y: 0.35, size: 0.08, rotation: 225, color: '#38bdf8'},
          {id: 'b1', kind: 'arrow', x: 0.2, y: 0.55, size: 0.08, rotation: 45, color: '#fbbf24'},
          {id: 'b2', kind: 'arrow', x: 0.8, y: 0.55, size: 0.08, rotation: 135, color: '#fbbf24'},
        ],
        showGuides: false,
        compareMode: false,
      },
    },
    {
      id: 'countdown',
      type: 'countdown',
      narration: 'Decide ahora.',
      onScreenText: 'Decide',
      durationSeconds: 3,
      transition: 'none',
      subtitleText: 'Decide',
      visual: {template: 'countdown', seconds: 3, label: 'Decide'},
    },
    {
      id: 'reveal',
      type: 'reveal',
      narration: 'Miden exactamente lo mismo. Las flechas engañan a tu percepción de longitud.',
      onScreenText: '¡Iguales!',
      durationSeconds: 4.5,
      transition: 'fade',
      subtitleText: 'Las dos miden lo mismo',
      visual: {
        template: 'optical-illusion',
        illusionType: 'mueller-lyer',
        shapes: [
          {id: 'a', kind: 'line', x: 0.2, y: 0.35, size: 0.6, rotation: 0, color: '#34d399'},
          {id: 'b', kind: 'line', x: 0.2, y: 0.55, size: 0.6, rotation: 0, color: '#34d399'},
        ],
        showGuides: true,
        compareMode: true,
      },
    },
    {
      id: 'outro',
      type: 'outro',
      narration: '¿Te engañó la ilusión? Cuéntalo.',
      onScreenText: '¿Te engañó?',
      durationSeconds: 2,
      transition: 'fade',
      subtitleText: '¿Te engañó?',
      visual: {template: 'text', headline: '¿Te engañó?', body: 'Comenta'},
    },
  ];

  return {
    id,
    title,
    language: options.language,
    niche: 'optical-illusion',
    format: 'optical-illusion',
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
      answerKey: {type: 'mueller-lyer', lengthsEqual: true, size: 0.6},
      validationStatus: 'partial',
    },
    callToAction: '¿Te engañó? Comenta.',
    sources: ['Ilusión de Müller-Lyer (propiedades geométricas declaradas en el visual).'],
    createdAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
};
