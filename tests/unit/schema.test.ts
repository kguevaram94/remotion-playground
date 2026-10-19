import {describe, expect, it} from 'vitest';
import {parseVideoScript} from '../../src/shorts/domain/script.schema';
import {buildNineDotsScript} from '../../src/shorts/templates/logic-puzzle';

describe('video script schema', () => {
  it('parses a valid nine-dots script', () => {
    const script = buildNineDotsScript('9 puntos', '9-puntos', {
      language: 'es',
      fps: 30,
      width: 1080,
      height: 1920,
      targetDurationSeconds: 25,
    });
    const parsed = parseVideoScript(script);
    expect(parsed.scenes.length).toBeGreaterThanOrEqual(3);
    expect(parsed.aspectRatio).toBe('9:16');
  });

  it('rejects incomplete scripts', () => {
    expect(() =>
      parseVideoScript({
        id: 'x',
        title: 'x',
      }),
    ).toThrow();
  });
});
