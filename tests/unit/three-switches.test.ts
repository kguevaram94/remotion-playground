import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {parseVideoScript} from '../../src/shorts/domain/script.schema';
import {validateBulbStateReveal} from '../../src/shorts/domain/puzzle-validator';
import {detectFormat, buildLogicPuzzleFromTitle} from '../../src/shorts/templates/select';
import {
  buildThreeSwitchesScript,
  isThreeSwitchesTitle,
} from '../../src/shorts/templates/three-switches';

describe('logic-lateral / three-switches', () => {
  it('parses the official script-logic-lateral plantilla', () => {
    const file = path.join(
      process.cwd(),
      'data/templates/script-logic-lateral.json',
    );
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const script = parseVideoScript(raw);
    expect(script.scenes.map((s) => s.type)).toEqual([
      'hook',
      'instruction',
      'countdown',
      'explanation',
      'reveal',
      'outro',
    ]);
    expect(script.scenes[0]!.visual.template).toBe('logic-room');
    expect(script.scenes[3]!.visual.template).toBe('switch-sequence');
    expect(script.scenes[4]!.visual.template).toBe('bulb-state-reveal');
    expect(script.callToAction.toLowerCase()).toMatch(/coment/);
  });

  it('detects interruptores / bombilla titles as logic-puzzle', () => {
    expect(isThreeSwitchesTitle('Tres interruptores y una bombilla')).toBe(
      true,
    );
    expect(detectFormat('Tres interruptores y una bombilla')).toBe(
      'logic-puzzle',
    );
  });

  it('builds three-switches from title via select', () => {
    const script = buildLogicPuzzleFromTitle(
      'Tres interruptores y una bombilla: ¿cuál la enciende?',
      'test-interruptores',
      {
        language: 'es',
        fps: 30,
        width: 1080,
        height: 1920,
        targetDurationSeconds: 32,
      },
    );
    expect(script.id).toBe('test-interruptores');
    const outro = script.scenes[script.scenes.length - 1]!;
    expect(outro.type).toBe('outro');
    expect(outro.narration.toLowerCase()).toMatch(/coment/);
    const reveal = script.scenes.find((s) => s.type === 'reveal')!;
    expect(reveal.visual.template).toBe('bulb-state-reveal');
    const validation = validateBulbStateReveal(reveal.visual);
    expect(validation.ok).toBe(true);
    expect(validation.level).toBe('partial');
  });

  it('buildThreeSwitchesScript matches beat and CTA', () => {
    const script = buildThreeSwitchesScript('Título', 'id', {
      language: 'es',
      fps: 30,
      width: 1080,
      height: 1920,
      targetDurationSeconds: 32,
    });
    const parsed = parseVideoScript(script);
    expect(parsed.scenes).toHaveLength(6);
    expect(parsed.solution.answerKey).toMatchObject({
      type: 'three-switches',
    });
  });
});
