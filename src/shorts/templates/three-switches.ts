import type {VideoScript} from '../domain/script.schema';
import {SCHEMA_VERSION} from '../config/defaults';

/**
 * Acertijo clásico de tres interruptores + bombilla (formato logic-lateral).
 * Beat: hook → rules → countdown → explanation → reveal → outro (CTA comentar).
 */
export const buildThreeSwitchesScript = (
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
      narration:
        'Tienes tres interruptores y una bombilla en otra habitación. Solo puedes entrar una vez. ¿Cuál la enciende?',
      onScreenText: '3 INTERRUPTORES\n1 BOMBILLA\n1 SOLA ENTRADA',
      durationSeconds: 4,
      transition: 'zoom',
      subtitleText: '3 interruptores, 1 bombilla, 1 entrada',
      visual: {
        template: 'logic-room',
        switches: ['A', 'B', 'C'],
        bulb: 'off',
        layout: 'split-room',
        showRuleCards: false,
      },
    },
    {
      id: 'rules',
      type: 'instruction',
      narration:
        'Puedes tocar los interruptores todas las veces que quieras, pero no ver la bombilla hasta entrar.',
      onScreenText: 'Puedes usar los interruptores\nNo puedes ver la bombilla',
      durationSeconds: 5,
      transition: 'slide-up',
      subtitleText: 'Interruptores sí, bombilla no',
      visual: {
        template: 'logic-room',
        switches: ['A', 'B', 'C'],
        bulb: 'hidden',
        layout: 'split-room',
        showRuleCards: true,
      },
    },
    {
      id: 'think',
      type: 'countdown',
      narration: 'Piénsalo. Tienes cinco segundos para encontrar una solución.',
      onScreenText: '¿CUÁL ES EL TRUCO?',
      durationSeconds: 5,
      transition: 'none',
      subtitleText: 'Cuenta atrás',
      visual: {
        template: 'countdown',
        seconds: 5,
        label: '¿Cuál es el truco?',
        background: 'logic-room',
      },
    },
    {
      id: 'step1',
      type: 'explanation',
      narration:
        'Primero, enciende el interruptor A y déjalo así unos minutos. Después, apágalo y enciende el interruptor B.',
      onScreenText: '1. A ENCENDIDO\n2. A APAGADO\n3. B ENCENDIDO',
      durationSeconds: 6,
      transition: 'fade',
      subtitleText: 'Primero A, luego B',
      visual: {
        template: 'switch-sequence',
        steps: [
          {switch: 'A', state: 'on'},
          {switch: 'A', state: 'off'},
          {switch: 'B', state: 'on'},
        ],
      },
    },
    {
      id: 'reveal',
      type: 'reveal',
      narration:
        'Ahora entra. Si la bombilla está encendida, es B. Si está apagada pero caliente, es A. Si está apagada y fría, es C.',
      onScreenText: 'ENCENDIDA = B\nAPAGADA Y CALIENTE = A\nAPAGADA Y FRÍA = C',
      durationSeconds: 8,
      transition: 'fade',
      subtitleText: 'Tres estados, tres respuestas',
      visual: {
        template: 'bulb-state-reveal',
        states: [
          {state: 'on', answer: 'B'},
          {state: 'off-warm', answer: 'A'},
          {state: 'off-cold', answer: 'C'},
        ],
      },
    },
    {
      id: 'outro',
      type: 'outro',
      narration:
        'El truco es usar el calor como una pista adicional. ¿Lo habías resuelto? Cuéntalo en los comentarios.',
      onScreenText: '¿LO RESOLVISTE?',
      durationSeconds: 5,
      transition: 'fade',
      subtitleText: 'Comenta tu método',
      visual: {
        template: 'text',
        headline: '¿LO RESOLVISTE?',
        body: 'Cuéntalo en los comentarios',
        accent: 'Deja tu método abajo ↓',
      },
    },
  ];

  const narration = scenes.map((s) => s.narration).join(' ');

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
    hook: 'Tienes tres interruptores y una bombilla en otra habitación. Solo puedes entrar una vez. ¿Cómo sabes cuál la enciende?',
    narration,
    scenes,
    solution: {
      summary:
        'A calienta, B enciende, C queda fría: tres estados con una sola entrada.',
      explanation:
        'Enciende el interruptor A durante unos minutos. Apágalo y enciende el B. Entra: encendida = B; apagada-caliente = A; apagada-fría = C. Presupone una bombilla que se calienta lo suficiente.',
      answerKey: {
        type: 'three-switches',
        mapping: {
          on: 'B',
          'off-warm': 'A',
          'off-cold': 'C',
        },
      },
      validationStatus: 'partial',
    },
    callToAction: '¿Lo habías resuelto? Cuéntalo en los comentarios.',
    sources: [
      'Acertijo clásico de los tres interruptores (estados encendida / caliente / fría).',
    ],
    createdAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
};

/** Detecta títulos del acertijo de interruptores / bombilla. */
export const isThreeSwitchesTitle = (title: string): boolean =>
  /interruptor|bombilla|switch/i.test(title);
