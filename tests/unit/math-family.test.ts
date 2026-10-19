import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {parseVideoScript} from '../../src/shorts/domain/script.schema';
import {
  validateArabicEquation,
  validateMathNarrative,
  validateMathPuzzle,
  validateScriptPuzzles,
} from '../../src/shorts/domain/puzzle-validator';
import {resolveFamily, resolveFamilyId} from '../../src/shorts/templates/registry';
import {
  buildMathPuzzleScript,
  MATH_BEAT_SEQUENCE,
} from '../../src/shorts/templates/math-puzzle';

const opts = {
  language: 'es',
  fps: 30,
  width: 1080,
  height: 1920,
  targetDurationSeconds: 28,
};

describe('math family (entrega B)', () => {
  it('parses and auto-validates the official script-math plantilla', () => {
    const file = path.join(process.cwd(), 'data/templates/script-math.json');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const script = parseVideoScript(raw);
    expect(script.family).toBe('math');
    expect(script.scenes.map((s) => s.type)).toEqual([...MATH_BEAT_SEQUENCE]);
    expect(resolveFamilyId(script)).toBe('math');
    expect(resolveFamily(script).beat.exactSequence).toEqual([
      ...MATH_BEAT_SEQUENCE,
    ]);
    const result = validateScriptPuzzles(script);
    expect(result.ok).toBe(true);
    expect(result.level).toBe('auto_validated');
    expect(result.details.family).toBe('math');
  });

  it('builds a math script with family and comment CTA', () => {
    const script = buildMathPuzzleScript('Suma rápida', 'math-build', opts);
    expect(script.family).toBe('math');
    expect(script.callToAction.toLowerCase()).toMatch(/coment/);
    expect(script.scenes.map((s) => s.type)).toEqual([...MATH_BEAT_SEQUENCE]);
    expect(validateScriptPuzzles(script).level).toBe('auto_validated');
  });

  it('does not use the logic-lateral beat sequence', () => {
    const script = buildMathPuzzleScript('Suma', 'math-2', opts);
    expect(script.scenes.map((s) => s.type)).not.toEqual([
      'hook',
      'instruction',
      'countdown',
      'explanation',
      'reveal',
      'outro',
    ]);
  });

  it('validates arabic equations and rejects wrong ones', () => {
    expect(validateArabicEquation('7+5=12').level).toBe('auto_validated');
    expect(validateArabicEquation('7+5=11').ok).toBe(false);
  });

  it('auto-validates operand/operator/result visuals', () => {
    const result = validateMathPuzzle({
      template: 'math-puzzle',
      expression: '7 + 5 = ?',
      operands: [7, 5],
      operator: '+',
      result: 12,
      revealAnswer: '7+5=12',
      steps: [],
    });
    expect(result.ok).toBe(true);
    expect(result.level).toBe('auto_validated');
  });

  it('checks narrative coherence answerKey ↔ reveal', () => {
    const script = buildMathPuzzleScript('Suma', 'math-3', opts);
    const reveal = script.scenes.find((s) => s.type === 'reveal')!;
    const ok = validateMathNarrative(script, reveal.visual);
    expect(ok.level).toBe('auto_validated');

    const broken = parseVideoScript({
      ...script,
      solution: {
        ...script.solution,
        answerKey: {
          type: 'math',
          equation: '7+5=12',
          result: 99,
          operands: [7, 5],
          operator: '+',
        },
      },
    });
    const fail = validateMathNarrative(
      broken,
      broken.scenes.find((s) => s.type === 'reveal')!.visual,
    );
    expect(fail.ok).toBe(false);
  });

  it('fails family beat when math sequence is wrong', () => {
    const script = buildMathPuzzleScript('Suma', 'math-4', opts);
    const broken = parseVideoScript({
      ...script,
      scenes: script.scenes.filter((s) => s.type !== 'explanation'),
    });
    const result = validateScriptPuzzles(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /Beat de familia/.test(e))).toBe(true);
  });
});
