import {describe, expect, it} from 'vitest';
import {
  groupWordsIntoSentences,
  pickSentenceAtTime,
  windowForSentence,
} from '../../src/shorts/subtitles/subtitle-sentences';

describe('subtitle-sentences', () => {
  const words = [
    {text: 'Nueve', startMs: 0, endMs: 400},
    {text: 'puntos.', startMs: 400, endMs: 800},
    {text: '¿Puedes', startMs: 800, endMs: 1200},
    {text: 'unirlos?', startMs: 1200, endMs: 1600},
    // paragraph pause
    {text: 'Reglas:', startMs: 2300, endMs: 2700},
    {text: 'líneas', startMs: 2700, endMs: 3100},
    {text: 'rectas.', startMs: 3100, endMs: 3500},
  ];

  it('splits on sentence end and on pause gaps', () => {
    const s = groupWordsIntoSentences(words);
    expect(s.map((x) => x.words.map((w) => w.text).join(' '))).toEqual([
      'Nueve puntos.',
      '¿Puedes unirlos?',
      'Reglas: líneas rectas.',
    ]);
  });

  it('holds finished sentence during pause, then starts fresh', () => {
    const s = groupWordsIntoSentences(words);
    const duringPause = pickSentenceAtTime(s, 2000);
    expect(duringPause?.inPause).toBe(true);
    expect(duringPause?.sentence.words.map((w) => w.text).join(' ')).toBe(
      '¿Puedes unirlos?',
    );

    const atReglas = pickSentenceAtTime(s, 2400);
    expect(atReglas?.inPause).toBe(false);
    expect(atReglas?.sentence.words[0]!.text).toBe('Reglas:');
  });

  it('shows the full fixed phrase at once (no progressive reveal)', () => {
    const s = groupWordsIntoSentences(words);
    const reglas = s[2]!;
    const win = windowForSentence(reglas, 2400, 5, false);
    expect(win.words.map((w) => w.text)).toEqual([
      'Reglas:',
      'líneas',
      'rectas.',
    ]);
  });
});
