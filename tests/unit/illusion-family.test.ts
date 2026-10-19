import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {parseVideoScript} from '../../src/shorts/domain/script.schema';
import {
  validateIllusionNarrative,
  validateOpticalIllusion,
  validateScriptPuzzles,
} from '../../src/shorts/domain/puzzle-validator';
import {resolveFamily, resolveFamilyId} from '../../src/shorts/templates/registry';
import {
  buildOpticalIllusionScript,
  ILLUSION_BEAT_SEQUENCE,
} from '../../src/shorts/templates/optical-illusion';

const opts = {
  language: 'es',
  fps: 30,
  width: 1080,
  height: 1920,
  targetDurationSeconds: 28,
};

describe('illusion family (entrega D)', () => {
  it('parses and partially validates the official script-illusion plantilla', () => {
    const file = path.join(process.cwd(), 'data/templates/script-illusion.json');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const script = parseVideoScript(raw);
    expect(script.family).toBe('illusion');
    expect(script.scenes.map((s) => s.type)).toEqual([...ILLUSION_BEAT_SEQUENCE]);
    expect(resolveFamilyId(script)).toBe('illusion');
    expect(resolveFamily(script).beat.exactSequence).toEqual([
      ...ILLUSION_BEAT_SEQUENCE,
    ]);
    const result = validateScriptPuzzles(script);
    expect(result.ok).toBe(true);
    expect(result.level).toBe('partial');
    expect(result.level).not.toBe('auto_validated');
    expect(result.details.family).toBe('illusion');
    expect(result.details.compareMode).toBe(true);
    expect(result.details.showGuides).toBe(true);
  });

  it('builds illusion script with family and comment CTA', () => {
    const script = buildOpticalIllusionScript('Ilusión', 'ill-1', opts);
    expect(script.family).toBe('illusion');
    expect(script.callToAction.toLowerCase()).toMatch(/coment/);
    expect(script.solution.validationStatus).toBe('partial');
    const result = validateScriptPuzzles(script);
    expect(result.ok).toBe(true);
    expect(result.level).toBe('partial');
  });

  it('does not use the logic-lateral beat sequence', () => {
    const script = buildOpticalIllusionScript('Ilusión', 'ill-2', opts);
    expect(script.scenes.map((s) => s.type)).not.toEqual([
      'hook',
      'instruction',
      'countdown',
      'explanation',
      'reveal',
      'outro',
    ]);
  });

  it('rejects reveal without compareMode or showGuides', () => {
    const script = buildOpticalIllusionScript('Ilusión', 'ill-3', opts);
    const reveal = script.scenes.find((s) => s.type === 'reveal')!;
    expect(reveal.visual.template).toBe('optical-illusion');
    if (reveal.visual.template !== 'optical-illusion') return;

    const noCompare = validateIllusionNarrative(script, {
      ...reveal.visual,
      compareMode: false,
    });
    expect(noCompare.ok).toBe(false);

    const noGuides = validateIllusionNarrative(script, {
      ...reveal.visual,
      showGuides: false,
    });
    expect(noGuides.ok).toBe(false);
  });

  it('never auto-validates optical illusion visuals', () => {
    const result = validateOpticalIllusion({
      template: 'optical-illusion',
      illusionType: 'mueller-lyer',
      shapes: [
        {id: 'a', kind: 'line', x: 0.2, y: 0.3, size: 0.6, rotation: 0, color: '#fff'},
        {id: 'b', kind: 'line', x: 0.2, y: 0.5, size: 0.6, rotation: 0, color: '#fff'},
      ],
      showGuides: true,
      compareMode: true,
    });
    expect(result.ok).toBe(true);
    expect(result.level).toBe('partial');
  });

  it('fails family beat when illusion sequence is wrong', () => {
    const script = buildOpticalIllusionScript('Ilusión', 'ill-4', opts);
    const broken = parseVideoScript({
      ...script,
      scenes: script.scenes.filter((s) => s.type !== 'explanation'),
    });
    expect(validateScriptPuzzles(broken).ok).toBe(false);
  });

  it('fails mueller-lyer with unequal declared lengths when lengthsEqual', () => {
    const script = buildOpticalIllusionScript('Ilusión', 'ill-5', opts);
    const reveal = script.scenes.find((s) => s.type === 'reveal')!;
    expect(reveal.visual.template).toBe('optical-illusion');
    if (reveal.visual.template !== 'optical-illusion') return;

    const bad = validateIllusionNarrative(script, {
      ...reveal.visual,
      shapes: [
        {id: 'a', kind: 'line', x: 0.2, y: 0.35, size: 0.6, rotation: 0, color: '#34d399'},
        {id: 'b', kind: 'line', x: 0.2, y: 0.55, size: 0.4, rotation: 0, color: '#34d399'},
      ],
    });
    expect(bad.ok).toBe(false);
  });
});
