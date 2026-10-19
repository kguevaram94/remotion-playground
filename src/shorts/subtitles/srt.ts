export type SubtitleCue = {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
};

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export const formatSrtTime = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
};

export const cuesToSrt = (cues: SubtitleCue[]): string => {
  return cues
    .map(
      (c) =>
        `${c.index}\n${formatSrtTime(c.startMs)} --> ${formatSrtTime(c.endMs)}\n${c.text}\n`,
    )
    .join('\n');
};

export const parseSrt = (content: string): SubtitleCue[] => {
  const blocks = content.replace(/\r/g, '').trim().split(/\n\n+/);
  const cues: SubtitleCue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;
    const index = Number(lines[0]);
    const match = lines[1]!.match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/,
    );
    if (!match) continue;
    const toMs = (h: string, m: string, s: string, ms: string) =>
      Number(h) * 3600000 + Number(m) * 60000 + Number(s) * 1000 + Number(ms);
    cues.push({
      index: Number.isFinite(index) ? index : cues.length + 1,
      startMs: toMs(match[1]!, match[2]!, match[3]!, match[4]!),
      endMs: toMs(match[5]!, match[6]!, match[7]!, match[8]!),
      text: lines.slice(2).join('\n'),
    });
  }
  return cues;
};

/** True if a token ends a sentence (punto y seguido / aparte / exclamación). */
export const endsSentenceToken = (token: string): boolean =>
  /[.!?…]["»')\]]*$/u.test(token.trim());

/**
 * Split on paragraph breaks first, then on . ! ? …
 * Never mid-sentence; keeps the trailing punctuation with the sentence.
 */
export const splitIntoSentences = (text: string): string[] => {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\n+/g, ' ').trim())
    .filter(Boolean);

  const sentences: string[] = [];
  for (const para of paragraphs) {
    const matches = para.match(/[^.!?…]+(?:[.!?…]+["»')\]]*)?(?=\s+|$)/gu);
    if (!matches) {
      sentences.push(para);
      continue;
    }
    for (const m of matches) {
      const t = m.trim();
      if (t) sentences.push(t);
    }
  }
  return sentences;
};

/** Soft-wrap a long sentence at word boundaries (never mid-sentence by period). */
export const wrapLongCue = (sentence: string, maxChars: number): string[] => {
  if (sentence.length <= maxChars) return [sentence];
  const words = sentence.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > maxChars && current) {
      chunks.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

/** Split subtitle text: one cue per sentence; wrap only if excessively long. */
export const splitTextForCues = (
  text: string,
  maxCueChars = 72,
): string[] => {
  const sentences = splitIntoSentences(text);
  if (!sentences.length) return [];
  return sentences.flatMap((s) => wrapLongCue(s, maxCueChars));
};

export const buildSubtitlesFromScenes = (
  scenes: Array<{
    subtitleText: string;
    durationSeconds: number;
  }>,
  options?: {maxCueChars?: number},
): SubtitleCue[] => {
  const maxCueChars = options?.maxCueChars ?? 72;
  const rebuilt: SubtitleCue[] = [];
  let cursorMs = 0;
  let index = 1;

  for (const scene of scenes) {
    const sceneMs = Math.round(scene.durationSeconds * 1000);
    const sceneStart = cursorMs;
    const sceneEnd = cursorMs + sceneMs;
    const chunks = splitTextForCues(scene.subtitleText, maxCueChars);

    if (chunks.length === 0) {
      cursorMs = sceneEnd;
      continue;
    }

    const slice = sceneMs / chunks.length;
    chunks.forEach((text, i) => {
      const startMs = Math.round(sceneStart + i * slice);
      const endMs = Math.round(
        Math.min(sceneEnd, sceneStart + (i + 1) * slice),
      );
      rebuilt.push({
        index,
        startMs,
        endMs: Math.max(startMs + 200, endMs),
        text,
      });
      index += 1;
    });
    if (rebuilt.length) {
      const last = rebuilt[rebuilt.length - 1]!;
      if (last.endMs > sceneEnd) last.endMs = sceneEnd;
    }
    cursorMs = sceneEnd;
  }

  return rebuilt;
};

/**
 * Group words into short on-screen chunks (~5 words).
 * Sentences may split across cues — karaoke highlighting uses word timings.
 */
export const alignCuesToAudio = (
  sceneTexts: string[],
  wordCues: Array<{text: string; startMs: number; endMs: number}>,
  totalDurationMs: number,
  options?: {groupSize?: number},
): SubtitleCue[] => {
  if (!wordCues.length) {
    return buildSubtitlesFromScenes(
      sceneTexts.map((t) => ({
        subtitleText: t,
        durationSeconds:
          totalDurationMs / 1000 / Math.max(1, sceneTexts.length),
      })),
    );
  }

  const groupSize = options?.groupSize ?? 5;
  const cues: SubtitleCue[] = [];
  for (let i = 0; i < wordCues.length; i += groupSize) {
    const group = wordCues.slice(i, i + groupSize);
    cues.push({
      index: cues.length + 1,
      startMs: group[0]!.startMs,
      endMs: Math.min(totalDurationMs, group[group.length - 1]!.endMs),
      text: group.map((g) => g.text).join(' '),
    });
  }
  return cues;
};
