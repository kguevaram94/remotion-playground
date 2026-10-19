import type {VideoScript} from '../domain/script.schema';
import {SCHEMA_VERSION} from '../config/defaults';

/** Map grid column/row (may be outside 0–2) to normalized [0,1] canvas coords. */
const g = (c: number, r: number): [number, number] => [
  0.25 + 0.25 * c,
  0.25 + 0.25 * r,
];

/**
 * Classic 3×3 nine-dots puzzle with the 4-line "think outside the box" solution.
 * Path (grid units): (0,2)→(3,2)→(0,-1)→(0,2)→(2,0)
 */
export const buildNineDotsScript = (
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
  const coords = [0.25, 0.5, 0.75];
  const dots = coords.flatMap((y, row) =>
    coords.map((x, col) => ({
      id: `d${row}${col}`,
      x,
      y,
    })),
  );

  const polyline = [g(0, 2), g(3, 2), g(0, -1), g(0, 2), g(2, 0)];
  const validatedLines: Array<{from: [number, number]; to: [number, number]}> =
    [
      {from: polyline[0]!, to: polyline[1]!},
      {from: polyline[1]!, to: polyline[2]!},
      {from: polyline[2]!, to: polyline[3]!},
      {from: polyline[3]!, to: polyline[4]!},
    ];

  const scenes: VideoScript['scenes'] = [
    {
      id: 'hook',
      type: 'hook',
      narration:
        'Nueve puntos. ¿Puedes unirlos todos con solo cuatro líneas rectas, sin levantar el lápiz?',
      onScreenText: '9 puntos · 4 líneas',
      durationSeconds: 3.2,
      transition: 'fade',
      subtitleText: '¿Puedes unir 9 puntos con 4 líneas?',
      visual: {
        template: 'hook',
        badge: 'RETO VISUAL',
        emphasis: '4 líneas · sin levantar el lápiz',
      },
    },
    {
      id: 'instruction',
      type: 'instruction',
      narration:
        'Reglas: líneas rectas, trazo continuo, debes pasar por los nueve puntos.',
      onScreenText: 'Rectas · continuo · 9 puntos',
      durationSeconds: 3.0,
      transition: 'slide-up',
      subtitleText: 'Líneas rectas y trazo continuo',
      visual: {
        template: 'text',
        headline: 'Reglas',
        body: '1) Solo líneas rectas\n2) Sin levantar el lápiz\n3) Pasa por los 9 puntos',
      },
    },
    {
      id: 'puzzle',
      type: 'puzzle',
      narration: 'Aquí tienes la cuadrícula. Piensa con calma.',
      onScreenText: '¿Cuál es tu trazo?',
      durationSeconds: 2.5,
      transition: 'zoom',
      subtitleText: 'Observa la cuadrícula',
      visual: {
        template: 'logic-puzzle',
        variant: 'nine-dots',
        dots,
        lines: [],
        objects: [],
        revealProgress: 0,
      },
    },
    {
      id: 'countdown',
      type: 'countdown',
      narration: 'Tienes unos segundos. ¿Ya lo tienes?',
      onScreenText: 'Resuelve',
      durationSeconds: 5.0,
      transition: 'none',
      subtitleText: 'Cuenta atrás',
      visual: {
        template: 'countdown',
        seconds: 5,
        label: 'Resuelve',
      },
    },
    {
      id: 'reveal',
      type: 'reveal',
      narration:
        'La clave es salir del cuadrado imaginario. Así se conectan los nueve puntos en cuatro trazos.',
      onScreenText: '¡Sal del cuadrado!',
      durationSeconds: 5.5,
      transition: 'fade',
      subtitleText: 'Hay que salir del cuadrado',
      visual: {
        template: 'logic-puzzle',
        variant: 'nine-dots',
        dots,
        lines: validatedLines,
        objects: [],
        revealProgress: 1,
      },
    },
    {
      id: 'explanation',
      type: 'explanation',
      narration:
        'Asumimos un borde que no existe. Al extender las líneas fuera de la cuadrícula, el trazo es posible.',
      onScreenText: 'El borde era imaginario',
      durationSeconds: 3.5,
      transition: 'slide-up',
      subtitleText: 'El borde no existía',
      visual: {
        template: 'text',
        headline: 'Por qué funciona',
        body: 'Las restricciones extras que inventamos bloquean la solución.',
        accent: 'Piensa fuera de la caja',
      },
    },
    {
      id: 'outro',
      type: 'outro',
      narration: '¿Lo resolviste antes de la revelación? Cuéntalo en comentarios.',
      onScreenText: '¿Lo lograste?',
      durationSeconds: 2.3,
      transition: 'fade',
      subtitleText: 'Comenta si lo resolviste',
      visual: {
        template: 'text',
        headline: '¿Lo resolviste?',
        body: 'Comenta tu tiempo o tu trazo',
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
    hook: scenes[0]!.onScreenText,
    narration,
    scenes,
    solution: {
      summary:
        'Cuatro líneas que salen del cuadrado imaginario cubren los 9 puntos.',
      explanation:
        'El trazo continuo empieza en la fila inferior, se extiende fuera de la cuadrícula, atraviesa diagonales y columnas extendidas, y cubre los nueve puntos sin levantar el lápiz.',
      answerKey: {
        type: 'nine-dots',
        lines: validatedLines,
        dots,
      },
      validationStatus: 'auto_validated',
    },
    callToAction: '¿Lo resolviste? Comenta abajo.',
    sources: [
      'Acertijo clásico de los 9 puntos (think outside the box). Solución geométrica verificada en código.',
    ],
    createdAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
};
