import {describe, expect, it} from 'vitest';
import {
  alignCuesToAudio,
  buildSubtitlesFromScenes,
  cuesToSrt,
  formatSrtTime,
  parseSrt,
  splitIntoSentences,
  splitTextForCues,
} from '../../src/shorts/subtitles/srt';

describe('srt', () => {
  it('formats timestamps', () => {
    expect(formatSrtTime(3661001)).toBe('01:01:01,001');
  });

  it('splits on punto y seguido / aparte', () => {
    expect(
      splitIntoSentences(
        'Primera frase. Segunda frase.\n\nTercera después del aparte.',
      ),
    ).toEqual([
      'Primera frase.',
      'Segunda frase.',
      'Tercera después del aparte.',
    ]);
  });

  it('keeps one cue per sentence (no mid-sentence cut at periods)', () => {
    const chunks = splitTextForCues(
      'Une los nueve puntos con cuatro líneas. No levantes el lápiz.',
    );
    expect(chunks).toEqual([
      'Une los nueve puntos con cuatro líneas.',
      'No levantes el lápiz.',
    ]);
  });

  it('builds and parses round-trip cues', () => {
    const cues = buildSubtitlesFromScenes([
      {subtitleText: 'Hola mundo de prueba. Segunda oración.', durationSeconds: 2},
      {subtitleText: 'Segunda escena', durationSeconds: 1},
    ]);
    expect(cues.length).toBeGreaterThanOrEqual(2);
    expect(cues[0]!.text).toMatch(/Hola mundo/);
    const srt = cuesToSrt(cues);
    const parsed = parseSrt(srt);
    expect(parsed[0]!.text).toBe(cues[0]!.text);
    expect(parsed[0]!.startMs).toBe(cues[0]!.startMs);
  });

  it('keeps cues within scene windows', () => {
    const cues = buildSubtitlesFromScenes([
      {
        subtitleText: 'Uno dos tres. Cuatro cinco seis.',
        durationSeconds: 2,
      },
    ]);
    expect(cues.every((c) => c.endMs <= 2000)).toBe(true);
  });

  it('groups word cues into short chunks (may split sentences)', () => {
    const words = [
      {text: 'Uno', startMs: 0, endMs: 100},
      {text: 'dos', startMs: 100, endMs: 200},
      {text: 'tres.', startMs: 200, endMs: 300},
      {text: 'Cuatro', startMs: 300, endMs: 400},
      {text: 'cinco', startMs: 400, endMs: 500},
      {text: 'seis.', startMs: 500, endMs: 600},
    ];
    const cues = alignCuesToAudio(['x'], words, 1000, {groupSize: 3});
    expect(cues.map((c) => c.text)).toEqual([
      'Uno dos tres.',
      'Cuatro cinco seis.',
    ]);
  });
});
