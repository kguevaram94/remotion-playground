import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {parseVideoScript} from '../../src/shorts/domain/script.schema';
import {validateScriptPuzzles} from '../../src/shorts/domain/puzzle-validator';
import {checkCommonBeat, COMMON_BEAT_RULES} from '../../src/shorts/domain/beat-check';
import {
  getTemplateFamily,
  inferFamilyId,
  resolveFamily,
  resolveFamilyId,
  UnknownTemplateFamilyError,
} from '../../src/shorts/templates/registry';
import {buildThreeSwitchesScript} from '../../src/shorts/templates/three-switches';
import {buildNineDotsScript} from '../../src/shorts/templates/logic-puzzle';
import {buildMathPuzzleScript} from '../../src/shorts/templates/math-puzzle';

const opts = {
  language: 'es',
  fps: 30,
  width: 1080,
  height: 1920,
  targetDurationSeconds: 32,
};

const loadLogicLateralPlantilla = () => {
  const file = path.join(
    process.cwd(),
    'data/templates/script-logic-lateral.json',
  );
  return parseVideoScript(JSON.parse(readFileSync(file, 'utf8')) as unknown);
};

describe('template family contract (entrega A)', () => {
  it('parses logic-lateral plantilla without family (no migration)', () => {
    const script = loadLogicLateralPlantilla();
    expect(script.family).toBeUndefined();
    expect(inferFamilyId(script)).toBe('logic-lateral');
    expect(resolveFamilyId(script)).toBe('logic-lateral');
    const validation = validateScriptPuzzles(script);
    expect(validation.ok).toBe(true);
    expect(validation.details.family).toBe('logic-lateral');
  });

  it('resolves explicit family on a logic-lateral script', () => {
    const base = loadLogicLateralPlantilla();
    const script = parseVideoScript({...base, family: 'logic-lateral'});
    expect(script.family).toBe('logic-lateral');
    expect(resolveFamily(script).id).toBe('logic-lateral');
    expect(validateScriptPuzzles(script).ok).toBe(true);
  });

  it('rejects unknown family with an explicit error', () => {
    expect(() => getTemplateFamily('no-such-family')).toThrow(
      UnknownTemplateFamilyError,
    );
    expect(() => getTemplateFamily('no-such-family')).toThrow(/desconocida/);

    const base = loadLogicLateralPlantilla();
    expect(() =>
      parseVideoScript({...base, family: 'no-such-family'}),
    ).toThrow();
  });

  it('infers math / memory / illusion / find-different / logic-puzzle', () => {
    const math = buildMathPuzzleScript('Cerillas', 'math-1', opts);
    expect(inferFamilyId(math)).toBe('math');

    const nine = buildNineDotsScript('9 puntos', '9-puntos', opts);
    expect(inferFamilyId(nine)).toBe('logic-puzzle');
    expect(nine.family).toBeUndefined();
    expect(validateScriptPuzzles(nine).ok).toBe(true);
  });

  it('keeps shared beat check separate from family-specific validators', () => {
    const script = buildThreeSwitchesScript('Tres interruptores', 'sw', opts);
    const common = checkCommonBeat(script, COMMON_BEAT_RULES);
    expect(common.ok).toBe(true);

    const withoutOutro = parseVideoScript({
      ...script,
      scenes: script.scenes.filter((s) => s.type !== 'outro'),
    });
    const commonFail = checkCommonBeat(withoutOutro, COMMON_BEAT_RULES);
    expect(commonFail.ok).toBe(false);
    expect(commonFail.errors[0]).toMatch(/outro/);

    // Family-specific: exactSequence only on logic-lateral
    const lateral = resolveFamily(script);
    expect(lateral.beat.exactSequence).toEqual([
      'hook',
      'instruction',
      'countdown',
      'explanation',
      'reveal',
      'outro',
    ]);
    const mathFamily = getTemplateFamily('math');
    expect(mathFamily.beat.exactSequence).toBeUndefined();
  });

  it('does not impose logic-lateral sequence on math stubs', () => {
    const math = buildMathPuzzleScript('Ecuación', 'm1', opts);
    expect(resolveFamilyId(math)).toBe('math');
    const result = validateScriptPuzzles(math);
    expect(result.ok).toBe(true);
    // Math stub beat ≠ logic-lateral; still passes common rules
    expect(math.scenes.map((s) => s.type)).not.toEqual([
      'hook',
      'instruction',
      'countdown',
      'explanation',
      'reveal',
      'outro',
    ]);
  });

  it('enforces logic-lateral exact sequence only for that family', () => {
    const script = buildThreeSwitchesScript('Interruptores', 'sw2', opts);
    const broken = parseVideoScript({
      ...script,
      family: 'logic-lateral',
      scenes: [...script.scenes].reverse(),
    });
    const result = validateScriptPuzzles(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /Beat de familia/.test(e))).toBe(true);
  });
});
