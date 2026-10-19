import {endsSentenceToken} from './srt';

export type TimedWord = {
  text: string;
  startMs: number;
  endMs: number;
};

export type SubtitleSentence = {
  words: TimedWord[];
  startMs: number;
  endMs: number;
};

/** Gap (ms) between words that counts as a speaking pause / new utterance. */
export const UTTERANCE_GAP_MS = 280;

/**
 * Group word timings into display sentences:
 * - ends on . ! ? …
 * - or when a pause gap appears before the next word
 */
export const groupWordsIntoSentences = (
  words: TimedWord[],
  gapMs = UTTERANCE_GAP_MS,
): SubtitleSentence[] => {
  const sentences: SubtitleSentence[] = [];
  let current: TimedWord[] = [];

  const flush = () => {
    if (!current.length) return;
    sentences.push({
      words: current,
      startMs: current[0]!.startMs,
      endMs: current[current.length - 1]!.endMs,
    });
    current = [];
  };

  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    if (
      current.length > 0 &&
      w.startMs - current[current.length - 1]!.endMs >= gapMs
    ) {
      flush();
    }
    current.push(w);
    if (endsSentenceToken(w.text)) {
      flush();
    }
  }
  flush();
  return sentences;
};

/**
 * Which sentence to show at timeMs:
 * - while speaking → current sentence
 * - during pause after a sentence → keep that finished sentence
 * - when next speech starts → next sentence (even a single word)
 */
export const pickSentenceAtTime = (
  sentences: SubtitleSentence[],
  timeMs: number,
): {sentence: SubtitleSentence; index: number; inPause: boolean} | null => {
  if (!sentences.length) return null;

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i]!;
    const next = sentences[i + 1];
    if (timeMs >= s.startMs && timeMs < s.endMs) {
      return {sentence: s, index: i, inPause: false};
    }
    // Hold finished sentence through the pause until next speech starts
    if (timeMs >= s.endMs) {
      const holdUntil = next ? next.startMs : s.endMs + 1200;
      if (timeMs < holdUntil) {
        return {sentence: s, index: i, inPause: true};
      }
    }
  }

  // Before first word
  if (timeMs < sentences[0]!.startMs) return null;
  return null;
};

/**
 * Fixed phrase on screen (full sentence, or a fixed chunk of ~wordsPerLine).
 * All words of the chunk are visible at once; only the active word is highlighted.
 */
export const windowForSentence = (
  sentence: SubtitleSentence,
  timeMs: number,
  wordsPerLine: number,
  inPause: boolean,
): {words: TimedWord[]; offset: number} => {
  // Short enough → whole sentence as one fixed phrase
  if (sentence.words.length <= wordsPerLine) {
    return {words: sentence.words, offset: 0};
  }

  if (inPause) {
    // Hold the last chunk of the finished sentence
    const start =
      Math.floor((sentence.words.length - 1) / wordsPerLine) * wordsPerLine;
    return {words: sentence.words.slice(start), offset: start};
  }

  let activeIdx = sentence.words.findIndex(
    (w) => timeMs >= w.startMs && timeMs < w.endMs,
  );
  if (activeIdx < 0) {
    activeIdx = 0;
    for (let i = sentence.words.length - 1; i >= 0; i--) {
      if (timeMs >= sentence.words[i]!.startMs) {
        activeIdx = i;
        break;
      }
    }
  }

  const windowStart = Math.floor(activeIdx / wordsPerLine) * wordsPerLine;
  return {
    words: sentence.words.slice(windowStart, windowStart + wordsPerLine),
    offset: windowStart,
  };
};
