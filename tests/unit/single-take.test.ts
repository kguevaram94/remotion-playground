import {describe, expect, it} from 'vitest';
import {
  assertSingleTakeDurationMatch,
  buildSingleTakeVoiceMeta,
  FILE_SINGLE_TAKE_CACHE_TOKEN,
  isSingleTakeVoiceMeta,
  SINGLE_TAKE_DURATION_TOLERANCE_SEC,
  sumSceneDurations,
} from '../../src/shorts/voice/single-take';

describe('single-take helpers', () => {
  it('accepts authorship within tolerance of WAV duration', () => {
    expect(() => assertSingleTakeDurationMatch(9.6, 9.6)).not.toThrow();
    expect(() =>
      assertSingleTakeDurationMatch(
        9.6,
        9.6 + SINGLE_TAKE_DURATION_TOLERANCE_SEC * 0.5,
      ),
    ).not.toThrow();
  });

  it('accepts authorship at the inclusive tolerance boundary (exact Δ = 0.05s)', () => {
    // Use 0 and the exported constant so |Δ| is bit-identical to the
    // tolerance the implementation compares against (avoid 9.6±T float drift).
    const script = SINGLE_TAKE_DURATION_TOLERANCE_SEC;
    const wav = 0;
    const delta = Math.abs(script - wav);
    expect(delta).toBe(SINGLE_TAKE_DURATION_TOLERANCE_SEC);
    expect(() => assertSingleTakeDurationMatch(script, wav)).not.toThrow();
    expect(() => assertSingleTakeDurationMatch(wav, script)).not.toThrow();
  });

  it('rejects authorship just above the tolerance boundary', () => {
    // Increment +0.001s → effective |Δ| = 0.051… > 0.05 (reliably representable).
    const overBy = 0.001;
    const wav = 0;
    const script = SINGLE_TAKE_DURATION_TOLERANCE_SEC + overBy;
    const delta = Math.abs(script - wav);
    expect(delta).toBeGreaterThan(SINGLE_TAKE_DURATION_TOLERANCE_SEC);
    expect(() => assertSingleTakeDurationMatch(script, wav)).toThrow(
      /no coincide con la duración del WAV/,
    );
  });

  it('rejects authorship beyond tolerance with an actionable message', () => {
    expect(() => assertSingleTakeDurationMatch(9.6, 12)).toThrow(
      /no coincide con la duración del WAV/,
    );
  });

  it('builds meta without segments and with uniform cuesKind', () => {
    const meta = buildSingleTakeVoiceMeta({
      durationSeconds: 9.6,
      provider: 'file',
      model: 'pilot.wav',
      isTestAudio: false,
      cues: [
        {text: 'Hola', startMs: 0, endMs: 4800},
        {text: 'mundo', startMs: 4800, endMs: 9600},
      ],
    });
    expect(meta.timingMode).toBe('single-take');
    expect(meta.cuesKind).toBe('uniform');
    expect(meta).not.toHaveProperty('segments');
    expect(FILE_SINGLE_TAKE_CACHE_TOKEN).toBe('file:single-take-v1');
  });

  it('detects single-take from timingMode, provider=file, or config', () => {
    expect(isSingleTakeVoiceMeta({timingMode: 'single-take'})).toBe(true);
    expect(isSingleTakeVoiceMeta({provider: 'file', segments: [{durationSeconds: 4.8}]})).toBe(
      true,
    );
    expect(isSingleTakeVoiceMeta({}, 'file')).toBe(true);
    expect(isSingleTakeVoiceMeta({provider: 'openai-tts'})).toBe(false);
    expect(isSingleTakeVoiceMeta({provider: 'chatterbox'})).toBe(false);
  });

  it('sums scene durations including mute outro', () => {
    expect(
      sumSceneDurations([
        {durationSeconds: 4},
        {durationSeconds: 5.566666666666666},
        {durationSeconds: 0.03333333333333333},
      ]),
    ).toBeCloseTo(9.6, 10);
  });
});
