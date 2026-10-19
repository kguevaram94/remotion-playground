import type {VideoScript} from './script.schema';
import type {Scene, Visual} from './scene.schema';

export type ValidationLevel = 'auto_validated' | 'partial' | 'pending_review' | 'failed';

export type PuzzleValidationResult = {
  level: ValidationLevel;
  ok: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
};

const fail = (
  errors: string[],
  warnings: string[] = [],
  details: Record<string, unknown> = {},
): PuzzleValidationResult => ({
  level: 'failed',
  ok: false,
  errors,
  warnings,
  details,
});

const ok = (
  level: ValidationLevel,
  warnings: string[] = [],
  details: Record<string, unknown> = {},
): PuzzleValidationResult => ({
  level,
  ok: level !== 'failed',
  errors: [],
  warnings,
  details,
});

const findPuzzleVisual = (scenes: Scene[]): Visual | undefined => {
  const reveal = scenes.find((s) => s.type === 'reveal');
  if (reveal) return reveal.visual;
  const puzzle = scenes.find((s) => s.type === 'puzzle');
  return puzzle?.visual;
};

/** Count squares in an n×n grid of unit cells (including larger squares). */
export const countSquaresInGrid = (n: number): number => {
  let total = 0;
  for (let size = 1; size <= n; size++) {
    total += (n - size + 1) ** 2;
  }
  return total;
};

/** Evaluate a simple arithmetic expression with +, -, *, / and integers. */
export const evalSimpleMath = (expression: string): number | null => {
  const cleaned = expression.replace(/\s+/g, '');
  if (!/^[\d+\-*/().]+$/.test(cleaned)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const value = Function(`"use strict"; return (${cleaned});`)() as number;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

/**
 * Validate matchstick digit segments.
 * Digits use classic 7-segment labels: a(top) b(ur) c(lr) d(bot) e(ll) f(ul) g(mid)
 */
const DIGIT_SEGMENTS: Record<string, string[]> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'd', 'e', 'g'],
  '3': ['a', 'b', 'c', 'd', 'g'],
  '4': ['b', 'c', 'f', 'g'],
  '5': ['a', 'c', 'd', 'f', 'g'],
  '6': ['a', 'c', 'd', 'e', 'f', 'g'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
  '+': ['h', 'v'],
  '-': ['h'],
  '=': ['eq1', 'eq2'],
};

export const segmentsToGlyph = (segments: string[]): string | null => {
  const key = [...segments].sort().join(',');
  for (const [glyph, segs] of Object.entries(DIGIT_SEGMENTS)) {
    if ([...segs].sort().join(',') === key) return glyph;
  }
  return null;
};

export const validateFindDifferent = (visual: Visual): PuzzleValidationResult => {
  if (visual.template !== 'find-different') {
    return fail(['Visual no es find-different']);
  }
  const expected = visual.rows * visual.cols;
  if (visual.cells.length !== expected) {
    return fail([
      `Celdas ${visual.cells.length} no coinciden con ${visual.rows}x${visual.cols}`,
    ]);
  }
  const answer = visual.cells.find((c) => c.id === visual.answerCellId);
  if (!answer) {
    return fail([`answerCellId ${visual.answerCellId} no existe`]);
  }
  const different = visual.cells.filter((c) => c.isDifferent);
  if (different.length !== 1) {
    return fail([`Se esperaba exactamente 1 celda diferente, hay ${different.length}`]);
  }
  if (!answer.isDifferent) {
    return fail(['La celda respuesta no está marcada como diferente']);
  }
  return ok('auto_validated', [], {answerCellId: answer.id});
};

export const validateMathPuzzle = (visual: Visual): PuzzleValidationResult => {
  if (visual.template !== 'math-puzzle') {
    return fail(['Visual no es math-puzzle']);
  }

  if (visual.matchsticks) {
    const beforeCount = visual.matchsticks.before.length;
    const afterCount = visual.matchsticks.after.length;
    const moved = Math.abs(beforeCount - afterCount);
    if (moved > visual.matchsticks.moves) {
      return fail([
        `Movimientos de cerillas inconsistentes: delta=${moved}, moves=${visual.matchsticks.moves}`,
      ]);
    }
    if (visual.revealAnswer) {
      const computed = evalSimpleMath(visual.revealAnswer.replace(/=/g, '==').replace(/==/g, '-').replace(/-/g, '-'));
      // Prefer checking left/right of equation
      const parts = visual.revealAnswer.split('=');
      if (parts.length === 2) {
        const left = evalSimpleMath(parts[0]!);
        const right = evalSimpleMath(parts[1]!);
        if (left === null || right === null) {
          return ok('partial', ['No se pudo evaluar la ecuación de cerillas'], {
            revealAnswer: visual.revealAnswer,
          });
        }
        if (left !== right) {
          return fail([`Ecuación incorrecta: ${visual.revealAnswer} (${left}≠${right})`]);
        }
        return ok('auto_validated', [], {equation: visual.revealAnswer, left, right});
      }
      void computed;
    }
    return ok('partial', ['Cerillas validadas parcialmente (conteo de movimientos)'], {
      beforeCount,
      afterCount,
    });
  }

  if (visual.result !== undefined && visual.operands && visual.operator) {
    const [a, b] = visual.operands;
    if (a === undefined || b === undefined) {
      return fail(['Faltan operandos']);
    }
    let expected: number;
    switch (visual.operator) {
      case '+':
        expected = a + b;
        break;
      case '-':
        expected = a - b;
        break;
      case '*':
        expected = a * b;
        break;
      case '/':
        expected = a / b;
        break;
      default:
        return fail([`Operador no soportado: ${visual.operator}`]);
    }
    if (Math.abs(expected - visual.result) > 1e-9) {
      return fail([`Resultado ${visual.result} ≠ ${expected}`]);
    }
    return ok('auto_validated', [], {expected});
  }

  const expr = visual.expression;
  if (expr.includes('?') || expr.includes('_')) {
    if (visual.revealAnswer) {
      const filled = expr.replace(/[?_]+/, visual.revealAnswer);
      const value = evalSimpleMath(filled.split('=')[0] ?? filled);
      if (visual.result !== undefined && value !== null && value !== visual.result) {
        return fail([`Respuesta ${visual.revealAnswer} no produce ${visual.result}`]);
      }
      return ok(
        value !== null ? 'auto_validated' : 'partial',
        value === null ? ['Expresión no evaluable automáticamente'] : [],
        {filled},
      );
    }
    return ok('pending_review', ['Falta revealAnswer para validar']);
  }

  const value = evalSimpleMath(expr);
  if (value === null) {
    return ok('partial', ['Expresión matemática no evaluable automáticamente'], {expr});
  }
  if (visual.result !== undefined && Math.abs(value - visual.result) > 1e-9) {
    return fail([`expression=${value} pero result=${visual.result}`]);
  }
  return ok('auto_validated', [], {value});
};

export const validateOpticalIllusion = (visual: Visual): PuzzleValidationResult => {
  if (visual.template !== 'optical-illusion') {
    return fail(['Visual no es optical-illusion']);
  }
  if (visual.illusionType === 'mueller-lyer' || visual.illusionType === 'ebbinghaus') {
    return ok(
      'partial',
      [
        'Ilusión óptica: se validan propiedades geométricas declaradas; la percepción subjetiva requiere revisión humana.',
      ],
      {illusionType: visual.illusionType, shapes: visual.shapes.length},
    );
  }
  if (visual.shapes.length === 0) {
    return ok('pending_review', ['Sin formas geométricas declaradas']);
  }
  return ok('partial', ['Validación geométrica parcial'], {
    shapeCount: visual.shapes.length,
  });
};

export const validateNineDots = (visual: Visual): PuzzleValidationResult => {
  if (visual.template !== 'logic-puzzle' || visual.variant !== 'nine-dots') {
    return fail(['No es el reto de los 9 puntos']);
  }
  if (!visual.dots || visual.dots.length !== 9) {
    return fail([`Se esperaban 9 puntos, hay ${visual.dots?.length ?? 0}`]);
  }
  if (!visual.lines || visual.lines.length < 4) {
    return fail(['La solución clásica requiere al menos 4 segmentos de línea']);
  }
  if (visual.lines.length > 4) {
    return ok('partial', ['Más de 4 líneas; la solución clásica usa exactamente 4'], {
      lineCount: visual.lines.length,
    });
  }

  // Check all dots are near some line segment (tolerance in normalized coords)
  const hits = new Set<string>();
  for (const dot of visual.dots) {
    for (const line of visual.lines) {
      const dist = pointToSegmentDistance(
        [dot.x, dot.y],
        line.from,
        line.to,
      );
      if (dist < 0.08) {
        hits.add(dot.id);
        break;
      }
    }
  }
  if (hits.size < 9) {
    return fail([
      `Solo ${hits.size}/9 puntos quedan cubiertos por las líneas (tol=0.08)`,
    ]);
  }
  return ok('auto_validated', [], {dotsHit: hits.size, lines: visual.lines.length});
};

const pointToSegmentDistance = (
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number => {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

export const validateLogicPuzzle = (visual: Visual): PuzzleValidationResult => {
  if (visual.template !== 'logic-puzzle') {
    return fail(['Visual no es logic-puzzle']);
  }
  if (visual.variant === 'nine-dots') {
    return validateNineDots(visual);
  }
  return ok('pending_review', [
    `Variante ${visual.variant}: sin validador automático específico`,
  ]);
};

/** Tres interruptores: estados on / off-warm / off-cold → A/B/C. */
export const validateBulbStateReveal = (
  visual: Visual,
): PuzzleValidationResult => {
  if (visual.template !== 'bulb-state-reveal') {
    return fail(['Visual no es bulb-state-reveal']);
  }
  const required = ['on', 'off-warm', 'off-cold'] as const;
  const seen = new Set(visual.states.map((s) => s.state));
  const missing = required.filter((s) => !seen.has(s));
  if (missing.length) {
    return fail([`Faltan estados: ${missing.join(', ')}`]);
  }
  const answers = visual.states.map((s) => s.answer);
  if (new Set(answers).size !== answers.length) {
    return fail(['Las respuestas de interruptor deben ser distintas']);
  }
  return ok(
    'partial',
    [
      'Solución válida con supuestos: bombilla que se calienta y comprobación segura del calor.',
    ],
    {
      type: 'three-switches',
      mapping: Object.fromEntries(
        visual.states.map((s) => [s.state, s.answer]),
      ),
    },
  );
};

export const validateMemoryChallenge = (visual: Visual): PuzzleValidationResult => {
  if (visual.template !== 'memory-challenge') {
    return fail(['Visual no es memory-challenge']);
  }
  if (visual.items.length < 2) {
    return fail(['Se necesitan al menos 2 elementos']);
  }
  if (visual.missingId) {
    const exists = visual.items.some((i) => i.id === visual.missingId);
    if (!exists) {
      return fail([`missingId ${visual.missingId} no está en items`]);
    }
    return ok('auto_validated', [], {missingId: visual.missingId});
  }
  if (visual.sequence) {
    const ids = new Set(visual.items.map((i) => i.id));
    const invalid = visual.sequence.filter((id) => !ids.has(id));
    if (invalid.length) {
      return fail([`IDs de secuencia inválidos: ${invalid.join(', ')}`]);
    }
    return ok('auto_validated', [], {sequenceLength: visual.sequence.length});
  }
  return ok('pending_review', ['Memoria sin missingId ni sequence']);
};

export const validateCountSquaresAnswer = (
  gridSize: number,
  claimed: number,
): PuzzleValidationResult => {
  const expected = countSquaresInGrid(gridSize);
  if (claimed !== expected) {
    return fail([`Cuadrados en ${gridSize}x${gridSize}: esperado ${expected}, declarado ${claimed}`], [], {
      expected,
      claimed,
    });
  }
  return ok('auto_validated', [], {expected});
};

export const validateScriptPuzzles = (script: VideoScript): PuzzleValidationResult => {
  const visual = findPuzzleVisual(script.scenes);
  if (!visual) {
    return fail(['No hay escena puzzle/reveal con visual']);
  }

  let result: PuzzleValidationResult;
  switch (script.format) {
    case 'find-different':
      result = validateFindDifferent(visual);
      break;
    case 'math-puzzle':
      result = validateMathPuzzle(visual);
      break;
    case 'optical-illusion':
      result = validateOpticalIllusion(visual);
      break;
    case 'logic-puzzle':
      if (visual.template === 'bulb-state-reveal') {
        result = validateBulbStateReveal(visual);
      } else if (visual.template === 'logic-puzzle') {
        result = validateLogicPuzzle(visual);
      } else {
        result = ok('pending_review', [
          `Visual ${visual.template}: sin validador automático para logic-puzzle`,
        ]);
      }
      break;
    case 'memory-challenge':
      result = validateMemoryChallenge(visual);
      break;
    default:
      result = ok('pending_review', ['Formato sin validador']);
  }

  // Extra: counting squares via solution.answerKey
  const answerKey = script.solution.answerKey as
    | {type?: string; gridSize?: number; count?: number}
    | undefined;
  if (answerKey?.type === 'count-squares' && answerKey.gridSize && answerKey.count !== undefined) {
    const squareCheck = validateCountSquaresAnswer(answerKey.gridSize, answerKey.count);
    if (!squareCheck.ok) return squareCheck;
    result = {
      ...result,
      level: 'auto_validated',
      warnings: [...result.warnings, ...squareCheck.warnings],
      details: {...result.details, squares: squareCheck.details},
    };
  }

  return result;
};
