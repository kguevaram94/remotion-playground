import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {parseVideoScript} from '../../src/shorts/domain/script.schema';
import {
  validateMemoryChallenge,
  validateMemoryNarrative,
  validateScriptPuzzles,
} from '../../src/shorts/domain/puzzle-validator';
import {resolveFamily, resolveFamilyId} from '../../src/shorts/templates/registry';
import {
  buildMemoryChallengeScript,
  MEMORY_BEAT_SEQUENCE,
} from '../../src/shorts/templates/memory-challenge';

const opts = {
  language: 'es',
  fps: 30,
  width: 1080,
  height: 1920,
  targetDurationSeconds: 28,
};

describe('memory family (entrega C)', () => {
  it('parses and auto-validates the official script-memory plantilla', () => {
    const file = path.join(process.cwd(), 'data/templates/script-memory.json');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const script = parseVideoScript(raw);
    expect(script.family).toBe('memory');
    expect(script.scenes.map((s) => s.type)).toEqual([...MEMORY_BEAT_SEQUENCE]);
    expect(resolveFamilyId(script)).toBe('memory');
    expect(resolveFamily(script).beat.exactSequence).toEqual([
      ...MEMORY_BEAT_SEQUENCE,
    ]);
    const result = validateScriptPuzzles(script);
    expect(result.ok).toBe(true);
    expect(result.level).toBe('auto_validated');
    expect(result.details.family).toBe('memory');
  });

  it('builds memory script with family and comment CTA', () => {
    const script = buildMemoryChallengeScript('Memoria', 'mem-1', opts);
    expect(script.family).toBe('memory');
    expect(script.callToAction.toLowerCase()).toMatch(/coment/);
    expect(validateScriptPuzzles(script).level).toBe('auto_validated');
  });

  it('does not use the logic-lateral beat sequence', () => {
    const script = buildMemoryChallengeScript('Memoria', 'mem-2', opts);
    expect(script.scenes.map((s) => s.type)).not.toEqual([
      'hook',
      'instruction',
      'countdown',
      'explanation',
      'reveal',
      'outro',
    ]);
  });

  it('rejects ask phase that still shows the missing item', () => {
    const bad = validateMemoryChallenge({
      template: 'memory-challenge',
      items: [
        {id: 'a', symbol: 'A', color: '#fff'},
        {id: 'b', symbol: 'B', color: '#000'},
      ],
      missingId: 'b',
      phase: 'ask',
    });
    expect(bad.ok).toBe(false);
  });

  it('checks narrative phase order and answerKey', () => {
    const script = buildMemoryChallengeScript('Memoria', 'mem-3', opts);
    const reveal = script.scenes.find((s) => s.type === 'reveal')!;
    expect(validateMemoryNarrative(script, reveal.visual).level).toBe(
      'auto_validated',
    );

    const broken = parseVideoScript({
      ...script,
      solution: {
        ...script.solution,
        answerKey: {type: 'memory', missingId: 'a'},
      },
    });
    expect(
      validateMemoryNarrative(
        broken,
        broken.scenes.find((s) => s.type === 'reveal')!.visual,
      ).ok,
    ).toBe(false);
  });

  it('fails family beat when memory sequence is wrong', () => {
    const script = buildMemoryChallengeScript('Memoria', 'mem-4', opts);
    const broken = parseVideoScript({
      ...script,
      scenes: script.scenes.filter((s) => s.type !== 'hint'),
    });
    const result = validateScriptPuzzles(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /Beat de familia/.test(e))).toBe(true);
  });
});
