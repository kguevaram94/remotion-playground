import {describe, expect, it} from 'vitest';
import {
  countSquaresInGrid,
  evalSimpleMath,
  validateBulbStateReveal,
  validateFindDifferent,
  validateNineDots,
  validateCountSquaresAnswer,
  validateMemoryChallenge,
  validateMathPuzzle,
} from '../../src/shorts/domain/puzzle-validator';
import {buildFindDifferentGrid} from '../../src/shorts/templates/find-different';
import {buildNineDotsScript} from '../../src/shorts/templates/logic-puzzle';

describe('puzzle validators', () => {
  it('counts squares in an n×n grid', () => {
    expect(countSquaresInGrid(1)).toBe(1);
    expect(countSquaresInGrid(2)).toBe(5);
    expect(countSquaresInGrid(4)).toBe(30);
  });

  it('evaluates simple math', () => {
    expect(evalSimpleMath('3+1')).toBe(4);
    expect(evalSimpleMath('10/2')).toBe(5);
    expect(evalSimpleMath('VI')).toBeNull();
  });

  it('validates find-different grids', () => {
    const grid = buildFindDifferentGrid(7, 3, 3);
    const result = validateFindDifferent(grid);
    expect(result.ok).toBe(true);
    expect(result.level).toBe('auto_validated');
  });

  it('validates nine-dots solution geometrically', () => {
    const script = buildNineDotsScript('9 puntos', '9-puntos', {
      language: 'es',
      fps: 30,
      width: 1080,
      height: 1920,
      targetDurationSeconds: 25,
    });
    const reveal = script.scenes.find((s) => s.type === 'reveal')!;
    const result = validateNineDots(reveal.visual);
    expect(result.ok).toBe(true);
    expect(result.level).toBe('auto_validated');
  });

  it('validates count-squares answers', () => {
    expect(validateCountSquaresAnswer(4, 30).ok).toBe(true);
    expect(validateCountSquaresAnswer(4, 16).ok).toBe(false);
  });

  it('validates memory missing id (ask excludes missing; reveal includes it)', () => {
    const ask = validateMemoryChallenge({
      template: 'memory-challenge',
      items: [{id: 'a', symbol: 'A', color: '#fff'}],
      missingId: 'b',
      phase: 'ask',
    });
    expect(ask.level).toBe('auto_validated');

    const reveal = validateMemoryChallenge({
      template: 'memory-challenge',
      items: [
        {id: 'a', symbol: 'A', color: '#fff'},
        {id: 'b', symbol: 'B', color: '#000'},
      ],
      missingId: 'b',
      phase: 'reveal',
    });
    expect(reveal.level).toBe('auto_validated');
  });

  it('validates arithmetic math puzzles', () => {
    const result = validateMathPuzzle({
      template: 'math-puzzle',
      expression: '3+1',
      operands: [3, 1],
      operator: '+',
      result: 4,
      steps: [],
      revealAnswer: '4=3+1',
    });
    expect(result.ok).toBe(true);
  });

  it('validates three-switches bulb-state-reveal', () => {
    const result = validateBulbStateReveal({
      template: 'bulb-state-reveal',
      states: [
        {state: 'on', answer: 'B'},
        {state: 'off-warm', answer: 'A'},
        {state: 'off-cold', answer: 'C'},
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.level).toBe('partial');
  });
});
