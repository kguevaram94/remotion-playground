import type {VideoScript, TemplateFamilyId} from './script.schema';
import type {Scene, Visual} from './scene.schema';
import {checkCommonBeat, checkFamilyBeat} from './beat-check';
import {resolveFamily} from '../templates/registry';

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

const evalBinary = (
  a: number,
  b: number,
  operator: '+' | '-' | '*' | '/' | '=',
): number | null => {
  switch (operator) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return b === 0 ? null : a / b;
    case '=':
      return null;
    default:
      return null;
  }
};

/** Valida ecuación arábiga `left=right` (p. ej. `7+5=12`). */
export const validateArabicEquation = (
  equation: string,
): PuzzleValidationResult => {
  const parts = equation.split('=').map((p) => p.trim());
  if (parts.length !== 2) {
    return fail([`Ecuación inválida (se esperaba a=b): ${equation}`]);
  }
  const left = evalSimpleMath(parts[0]!);
  const right = evalSimpleMath(parts[1]!);
  if (left === null || right === null) {
    return ok('partial', ['No se pudo evaluar la ecuación arábiga'], {equation});
  }
  if (Math.abs(left - right) > 1e-9) {
    return fail([`Ecuación incorrecta: ${equation} (${left}≠${right})`]);
  }
  return ok('auto_validated', [], {equation, left, right});
};

export const validateMathPuzzle = (visual: Visual): PuzzleValidationResult => {
  if (visual.template !== 'math-puzzle') {
    return fail(['Visual no es math-puzzle']);
  }

  if (visual.matchsticks) {
    if (visual.matchsticks.moves < 1) {
      return fail(['matchsticks.moves debe ser ≥ 1']);
    }
    if (visual.revealAnswer && /[\d+\-*/()]/.test(visual.revealAnswer)) {
      const eq = validateArabicEquation(visual.revealAnswer);
      if (!eq.ok || eq.level === 'auto_validated') {
        return {
          ...eq,
          details: {
            ...eq.details,
            matchsticks: {
              before: visual.matchsticks.before.length,
              after: visual.matchsticks.after.length,
              moves: visual.matchsticks.moves,
            },
          },
        };
      }
      return eq;
    }
    return ok(
      'partial',
      [
        'Cerillas: se valida estructura; la transformación geométrica requiere revisión o revealAnswer arábigo',
      ],
      {
        beforeCount: visual.matchsticks.before.length,
        afterCount: visual.matchsticks.after.length,
        moves: visual.matchsticks.moves,
      },
    );
  }

  if (visual.result !== undefined && visual.operands && visual.operator) {
    const [a, b] = visual.operands;
    if (a === undefined || b === undefined) {
      return fail(['Faltan operandos']);
    }
    const expected = evalBinary(a, b, visual.operator);
    if (expected === null) {
      return fail([`Operador no evaluable: ${visual.operator}`]);
    }
    if (Math.abs(expected - visual.result) > 1e-9) {
      return fail([`Resultado ${visual.result} ≠ ${expected}`]);
    }
    if (visual.revealAnswer && visual.revealAnswer.includes('=')) {
      const eq = validateArabicEquation(visual.revealAnswer);
      if (!eq.ok) return eq;
    }
    return ok('auto_validated', [], {expected, operands: [a, b], operator: visual.operator});
  }

  if (visual.revealAnswer && visual.revealAnswer.includes('=')) {
    return validateArabicEquation(visual.revealAnswer);
  }

  const expr = visual.expression;
  if (expr.includes('?') || expr.includes('_')) {
    if (visual.revealAnswer) {
      const filled = expr.replace(/[?_]+/, visual.revealAnswer);
      const lhs = filled.split('=')[0] ?? filled;
      const value = evalSimpleMath(lhs);
      if (visual.result !== undefined && value !== null && value !== visual.result) {
        return fail([`Respuesta ${visual.revealAnswer} no produce ${visual.result}`]);
      }
      return ok(
        value !== null ? 'auto_validated' : 'partial',
        value === null ? ['Expresión no evaluable automáticamente'] : [],
        {filled, value},
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

type MathAnswerKey = {
  type?: string;
  equation?: string;
  left?: number;
  right?: number;
  result?: number;
  operands?: number[];
  operator?: '+' | '-' | '*' | '/' | '=';
};

/**
 * Coherencia narrativa básica math: answerKey ↔ visual de reveal.
 * No usa LLM; solo datos declarativos.
 */
export const validateMathNarrative = (
  script: VideoScript,
  visual: Visual,
): PuzzleValidationResult => {
  if (visual.template !== 'math-puzzle') {
    return fail(['Narrativa math requiere visual math-puzzle en reveal']);
  }

  const key = script.solution.answerKey as MathAnswerKey | undefined;
  const warnings: string[] = [];
  const details: Record<string, unknown> = {narrative: true};

  if (!key || (key.type && key.type !== 'math')) {
    return ok('partial', ['answerKey math ausente o type≠math'], details);
  }

  if (key.result !== undefined && visual.result !== undefined) {
    if (Math.abs(key.result - visual.result) > 1e-9) {
      return fail(
        [`answerKey.result ${key.result} ≠ visual.result ${visual.result}`],
        [],
        details,
      );
    }
  }

  if (key.operands && visual.operands) {
    if (
      key.operands.length !== visual.operands.length ||
      key.operands.some((n, i) => n !== visual.operands![i])
    ) {
      return fail(['answerKey.operands no coinciden con el visual de reveal'], [], details);
    }
  }

  if (key.operator && visual.operator && key.operator !== visual.operator) {
    return fail(
      [`answerKey.operator ${key.operator} ≠ visual.operator ${visual.operator}`],
      [],
      details,
    );
  }

  if (key.equation) {
    const eq = validateArabicEquation(key.equation);
    if (!eq.ok) return {...eq, details: {...eq.details, ...details}};
    if (visual.revealAnswer) {
      const norm = (s: string) => s.replace(/\s+/g, '');
      if (norm(key.equation) !== norm(visual.revealAnswer)) {
        return fail(
          [
            `answerKey.equation (${key.equation}) ≠ revealAnswer (${visual.revealAnswer})`,
          ],
          [],
          details,
        );
      }
    }
    details.equation = key.equation;
  } else if (!visual.revealAnswer && visual.result === undefined) {
    warnings.push('Sin equation ni revealAnswer: narrativa math incompleta');
  }

  const puzzle = script.scenes.find((s) => s.type === 'puzzle');
  if (
    puzzle?.visual.template === 'math-puzzle' &&
    puzzle.visual.expression &&
    visual.expression &&
    puzzle.visual.expression.includes('?') &&
    !visual.revealAnswer &&
    visual.result === undefined
  ) {
    warnings.push('Reveal no aporta solución numérica declarada');
  }

  return ok('auto_validated', warnings, details);
};

export const validateOpticalIllusion = (visual: Visual): PuzzleValidationResult => {
  if (visual.template !== 'optical-illusion') {
    return fail(['Visual no es optical-illusion']);
  }

  const details: Record<string, unknown> = {
    illusionType: visual.illusionType,
    shapeCount: visual.shapes.length,
    compareMode: visual.compareMode,
    showGuides: visual.showGuides,
  };

  if (visual.shapes.length === 0) {
    return ok('pending_review', ['Sin formas geométricas declaradas'], details);
  }

  const ids = visual.shapes.map((s) => s.id);
  if (new Set(ids).size !== ids.length) {
    return fail(['IDs de shapes duplicados'], [], details);
  }

  if (visual.illusionType === 'mueller-lyer') {
    const lines = visual.shapes.filter((s) => s.kind === 'line');
    if (lines.length < 2) {
      return fail(
        ['Müller-Lyer requiere al menos 2 líneas (kind=line)'],
        [],
        details,
      );
    }
    details.lineSizes = lines.map((l) => l.size);
  }

  // Nunca auto_validated: la percepción es subjetiva.
  return ok(
    'partial',
    [
      'Ilusión óptica: geometría declarada OK; la percepción subjetiva requiere revisión humana (nunca auto_validated).',
    ],
    details,
  );
};

type IllusionAnswerKey = {
  type?: string;
  lengthsEqual?: boolean;
  size?: number;
};

/**
 * Coherencia puzzle↔reveal + guías compareMode para familia illusion.
 * Resultado máximo: partial / pending_review (nunca auto_validated).
 */
export const validateIllusionNarrative = (
  script: VideoScript,
  revealVisual: Visual,
): PuzzleValidationResult => {
  if (revealVisual.template !== 'optical-illusion') {
    return fail(['Narrativa illusion requiere visual optical-illusion en reveal']);
  }

  const illusionScenes = script.scenes.filter(
    (s) => s.visual.template === 'optical-illusion',
  );
  const details: Record<string, unknown> = {
    narrative: true,
    sceneCount: illusionScenes.length,
  };

  const puzzle = script.scenes.find(
    (s) =>
      s.type === 'puzzle' && s.visual.template === 'optical-illusion',
  );
  const reveal = revealVisual;

  if (!puzzle || puzzle.visual.template !== 'optical-illusion') {
    return fail(['Falta escena puzzle con optical-illusion'], [], details);
  }

  if (puzzle.visual.illusionType !== reveal.illusionType) {
    return fail(
      [
        `illusionType puzzle (${puzzle.visual.illusionType}) ≠ reveal (${reveal.illusionType})`,
      ],
      [],
      details,
    );
  }

  // Guías oficiales de reveal (entrega D): compareMode + showGuides.
  if (!reveal.compareMode) {
    return fail(
      ['Reveal illusion debe usar compareMode=true (guía de comparación)'],
      [],
      details,
    );
  }
  if (!reveal.showGuides) {
    return fail(
      ['Reveal illusion debe usar showGuides=true (guías visuales)'],
      [],
      details,
    );
  }

  if (puzzle.visual.compareMode) {
    return fail(
      ['Puzzle illusion no debe activar compareMode (reserva para reveal)'],
      [],
      details,
    );
  }

  const key = script.solution.answerKey as IllusionAnswerKey | undefined;
  if (reveal.illusionType === 'mueller-lyer' && key?.lengthsEqual) {
    const lines = reveal.shapes.filter((s) => s.kind === 'line');
    if (lines.length < 2) {
      return fail(['Reveal Müller-Lyer con lengthsEqual necesita ≥2 líneas'], [], details);
    }
    const sizes = lines.map((l) => l.size);
    const expected = key.size ?? sizes[0];
    if (sizes.some((s) => s !== expected)) {
      return fail(
        [
          `lengthsEqual: tamaños de línea incoherentes (${sizes.join(', ')}; esperado ${expected})`,
        ],
        [],
        details,
      );
    }
    details.lengthsEqual = true;
    details.size = expected;
  }

  details.compareMode = true;
  details.showGuides = true;
  details.illusionType = reveal.illusionType;

  return ok(
    'partial',
    [
      'Narrativa illusion coherente (puzzle→reveal + compareMode/showGuides); percepción pendiente de revisión humana.',
    ],
    details,
  );
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
  if (visual.items.length < 2 && visual.phase !== 'ask') {
    return fail(['Se necesitan al menos 2 elementos']);
  }
  if (visual.phase === 'ask' && visual.items.length < 1) {
    return fail(['Fase ask: se necesita al menos 1 elemento visible']);
  }

  const ids = visual.items.map((i) => i.id);
  if (new Set(ids).size !== ids.length) {
    return fail(['IDs de items duplicados']);
  }

  if (visual.missingId) {
    const exists = visual.items.some((i) => i.id === visual.missingId);
    if (visual.phase === 'ask') {
      if (exists) {
        return fail([
          'Fase ask: missingId no debe aparecer en items visibles',
        ]);
      }
      return ok('auto_validated', [], {
        missingId: visual.missingId,
        phase: 'ask',
        visibleCount: visual.items.length,
      });
    }
    if (!exists) {
      return fail([`missingId ${visual.missingId} no está en items`]);
    }
    return ok('auto_validated', [], {
      missingId: visual.missingId,
      phase: visual.phase,
    });
  }

  if (visual.sequence) {
    const idSet = new Set(ids);
    const invalid = visual.sequence.filter((sid) => !idSet.has(sid));
    if (invalid.length) {
      return fail([`IDs de secuencia inválidos: ${invalid.join(', ')}`]);
    }
    return ok('auto_validated', [], {sequenceLength: visual.sequence.length});
  }

  if (visual.phase === 'show' || visual.phase === 'hide') {
    return ok('auto_validated', [], {
      phase: visual.phase,
      itemCount: visual.items.length,
    });
  }

  return ok('pending_review', ['Memoria sin missingId ni sequence']);
};

type MemoryAnswerKey = {
  type?: string;
  missingId?: string;
  symbol?: string;
  color?: string;
  sequence?: string[];
};

/**
 * Coherencia de fases + answerKey↔reveal para familia memory.
 */
export const validateMemoryNarrative = (
  script: VideoScript,
  revealVisual: Visual,
): PuzzleValidationResult => {
  if (revealVisual.template !== 'memory-challenge') {
    return fail(['Narrativa memory requiere visual memory-challenge en reveal']);
  }

  const memoryScenes = script.scenes.filter(
    (s) => s.visual.template === 'memory-challenge',
  );
  const phases = memoryScenes.map((s) =>
    s.visual.template === 'memory-challenge' ? s.visual.phase : undefined,
  );
  const details: Record<string, unknown> = {narrative: true, phases};

  const expectedOrder = ['show', 'hide', 'ask', 'reveal'] as const;
  const compact = phases.filter(Boolean) as string[];
  for (let i = 0; i < expectedOrder.length; i++) {
    if (compact[i] !== expectedOrder[i]) {
      return fail(
        [
          `Fases memory incoherentes: se esperaba ${expectedOrder.join('→')}, hay ${compact.join('→')}`,
        ],
        [],
        details,
      );
    }
  }

  const show = memoryScenes.find(
    (s) => s.visual.template === 'memory-challenge' && s.visual.phase === 'show',
  );
  const ask = memoryScenes.find(
    (s) => s.visual.template === 'memory-challenge' && s.visual.phase === 'ask',
  );
  const reveal = revealVisual;

  if (
    !show ||
    show.visual.template !== 'memory-challenge' ||
    !ask ||
    ask.visual.template !== 'memory-challenge' ||
    reveal.template !== 'memory-challenge'
  ) {
    return fail(['Faltan escenas memory show/ask/reveal'], [], details);
  }

  const missingId = reveal.missingId ?? ask.visual.missingId;
  if (!missingId) {
    return fail(['Falta missingId en ask/reveal'], [], details);
  }

  if (!show.visual.items.some((i) => i.id === missingId)) {
    return fail([`missingId ${missingId} no estaba en la fase show`], [], details);
  }
  if (ask.visual.items.some((i) => i.id === missingId)) {
    return fail([`missingId ${missingId} sigue visible en ask`], [], details);
  }
  if (!reveal.items.some((i) => i.id === missingId)) {
    return fail([`missingId ${missingId} ausente en reveal`], [], details);
  }

  const key = script.solution.answerKey as MemoryAnswerKey | undefined;
  if (!key || (key.type && key.type !== 'memory')) {
    return ok('partial', ['answerKey memory ausente o type≠memory'], details);
  }
  if (key.missingId && key.missingId !== missingId) {
    return fail(
      [`answerKey.missingId ${key.missingId} ≠ visual ${missingId}`],
      [],
      details,
    );
  }
  const revealed = reveal.items.find((i) => i.id === missingId);
  if (key.symbol && revealed && key.symbol !== revealed.symbol) {
    return fail(
      [`answerKey.symbol ${key.symbol} ≠ ${revealed.symbol}`],
      [],
      details,
    );
  }
  if (key.color && revealed && key.color !== revealed.color) {
    return fail(
      [`answerKey.color ${key.color} ≠ ${revealed.color}`],
      [],
      details,
    );
  }

  details.missingId = missingId;
  return ok('auto_validated', [], details);
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

/**
 * Validador específico por familia (visual / answerKey).
 * Separado del beat checker compartido (`beat-check.ts`).
 */
export const validateFamilyPuzzle = (
  familyId: TemplateFamilyId,
  script: VideoScript,
  visual: Visual,
): PuzzleValidationResult => {
  let result: PuzzleValidationResult;

  switch (familyId) {
    case 'find-different':
      result = validateFindDifferent(visual);
      break;
    case 'math': {
      const visualResult = validateMathPuzzle(visual);
      if (!visualResult.ok) {
        result = visualResult;
        break;
      }
      const narrative = validateMathNarrative(script, visual);
      if (!narrative.ok) {
        result = narrative;
        break;
      }
      const rank = (level: ValidationLevel) =>
        ({auto_validated: 0, partial: 1, pending_review: 2, failed: 3})[level];
      const level =
        rank(visualResult.level) >= rank(narrative.level)
          ? visualResult.level
          : narrative.level;
      result = {
        level,
        ok: level !== 'failed',
        errors: [],
        warnings: [...visualResult.warnings, ...narrative.warnings],
        details: {...visualResult.details, ...narrative.details},
      };
      break;
    }
    case 'illusion': {
      const visualResult = validateOpticalIllusion(visual);
      if (!visualResult.ok) {
        result = visualResult;
        break;
      }
      const narrative = validateIllusionNarrative(script, visual);
      if (!narrative.ok) {
        result = narrative;
        break;
      }
      const rank = (level: ValidationLevel) =>
        ({auto_validated: 0, partial: 1, pending_review: 2, failed: 3})[level];
      const level =
        rank(visualResult.level) >= rank(narrative.level)
          ? visualResult.level
          : narrative.level;
      // Cap: illusion nunca sube a auto_validated.
      const capped: ValidationLevel =
        level === 'auto_validated' ? 'partial' : level;
      result = {
        level: capped,
        ok: capped !== 'failed',
        errors: [],
        warnings: [...visualResult.warnings, ...narrative.warnings],
        details: {...visualResult.details, ...narrative.details},
      };
      break;
    }
    case 'memory': {
      const visualResult = validateMemoryChallenge(visual);
      if (!visualResult.ok) {
        result = visualResult;
        break;
      }
      const narrative = validateMemoryNarrative(script, visual);
      if (!narrative.ok) {
        result = narrative;
        break;
      }
      const rank = (level: ValidationLevel) =>
        ({auto_validated: 0, partial: 1, pending_review: 2, failed: 3})[level];
      const level =
        rank(visualResult.level) >= rank(narrative.level)
          ? visualResult.level
          : narrative.level;
      result = {
        level,
        ok: level !== 'failed',
        errors: [],
        warnings: [...visualResult.warnings, ...narrative.warnings],
        details: {...visualResult.details, ...narrative.details},
      };
      break;
    }
    case 'logic-lateral':
      if (visual.template === 'bulb-state-reveal') {
        result = validateBulbStateReveal(visual);
      } else {
        result = ok('pending_review', [
          `Visual ${visual.template}: logic-lateral espera bulb-state-reveal en reveal`,
        ]);
      }
      break;
    case 'logic-puzzle':
      if (visual.template === 'logic-puzzle') {
        result = validateLogicPuzzle(visual);
      } else if (visual.template === 'bulb-state-reveal') {
        // Script mal etiquetado: aún validamos el visual
        result = validateBulbStateReveal(visual);
      } else {
        result = ok('pending_review', [
          `Visual ${visual.template}: sin validador automático para logic-puzzle`,
        ]);
      }
      break;
    default: {
      const _exhaustive: never = familyId;
      void _exhaustive;
      result = ok('pending_review', ['Familia sin validador']);
    }
  }

  const answerKey = script.solution.answerKey as
    | {type?: string; gridSize?: number; count?: number}
    | undefined;
  if (
    answerKey?.type === 'count-squares' &&
    answerKey.gridSize &&
    answerKey.count !== undefined
  ) {
    const squareCheck = validateCountSquaresAnswer(
      answerKey.gridSize,
      answerKey.count,
    );
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

/**
 * Orquesta: resolución de familia → beat común → beat de familia → validador específico.
 */
export const validateScriptPuzzles = (
  script: VideoScript,
): PuzzleValidationResult => {
  const family = resolveFamily(script);

  const commonBeat = checkCommonBeat(script, family.beat.common);
  if (!commonBeat.ok) {
    return fail(commonBeat.errors, commonBeat.warnings, {
      family: family.id,
      beat: commonBeat.details,
    });
  }

  const familyBeat = checkFamilyBeat(script, family.beat);
  if (!familyBeat.ok) {
    return fail(familyBeat.errors, familyBeat.warnings, {
      family: family.id,
      familyBeat: familyBeat.details,
    });
  }

  const visual = findPuzzleVisual(script.scenes);
  if (!visual) {
    return fail(['No hay escena puzzle/reveal con visual'], familyBeat.warnings, {
      family: family.id,
    });
  }

  const result = validateFamilyPuzzle(family.id, script, visual);
  return {
    ...result,
    warnings: [
      ...commonBeat.warnings,
      ...familyBeat.warnings,
      ...result.warnings,
    ],
    details: {
      ...result.details,
      family: family.id,
      commonBeat: commonBeat.details,
      familyBeat: familyBeat.details,
    },
  };
};
