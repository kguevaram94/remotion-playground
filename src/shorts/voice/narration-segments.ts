import {PAUSE_PARAGRAPH_SEC} from '../media/wav-concat';

export type NarrationSpeechSegment = {
  text: string;
  /** Silence to insert after this speech segment */
  pauseAfterSec: number;
  /** Scene that owns this speech (for duration sync) */
  sceneId: string;
};

/**
 * One TTS call per paragraph / scene.
 * Pauses only between paragraphs (punto y aparte / cambio de escena) —
 * not after every sentence, so reading stays natural and fast.
 */
export const buildNarrationSegments = (
  scenes: Array<{id: string; narration: string}>,
): NarrationSpeechSegment[] => {
  const segments: NarrationSpeechSegment[] = [];

  for (let si = 0; si < scenes.length; si++) {
    const scene = scenes[si]!;
    const raw = scene.narration.trim();
    if (!raw) continue;

    const paragraphs = raw
      .replace(/\r\n/g, '\n')
      .split(/\n\s*\n+/)
      .map((p) => p.replace(/\n+/g, ' ').trim())
      .filter(Boolean);

    for (let pi = 0; pi < paragraphs.length; pi++) {
      const isLastOverall =
        si === scenes.length - 1 && pi === paragraphs.length - 1;
      segments.push({
        text: paragraphs[pi]!,
        pauseAfterSec: isLastOverall ? 0 : PAUSE_PARAGRAPH_SEC,
        sceneId: scene.id,
      });
    }
  }

  return segments;
};

export const joinNarrationPlain = (
  scenes: Array<{narration: string}>,
): string => scenes.map((s) => s.narration).join(' ');
