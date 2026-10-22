import {describe, expect, it} from 'vitest';
import {PAUSE_PARAGRAPH_SEC} from '../../src/shorts/media/wav-concat';
import {buildNarrationSegments} from '../../src/shorts/voice/narration-segments';

describe('narration-segments', () => {
  it('keeps sentences in one segment; pauses only between scenes', () => {
    const segs = buildNarrationSegments([
      {id: 'a', narration: 'Primera. Segunda.'},
      {id: 'b', narration: 'Tras el aparte.'},
    ]);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.text).toBe('Primera. Segunda.');
    expect(segs[0]!.sceneId).toBe('a');
    expect(segs[0]!.pauseAfterSec).toBe(PAUSE_PARAGRAPH_SEC);
    expect(segs[1]!.pauseAfterSec).toBe(0);
    expect(segs[1]!.sceneId).toBe('b');
  });

  it('treats blank lines as paragraph breaks', () => {
    const segs = buildNarrationSegments([{id: 'x', narration: 'Uno.\n\nDos.'}]);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.pauseAfterSec).toBe(PAUSE_PARAGRAPH_SEC);
    expect(segs[1]!.pauseAfterSec).toBe(0);
    expect(segs.every((s) => s.sceneId === 'x')).toBe(true);
  });

  it('skips mute scenes (empty narration) without inventing a speech segment', () => {
    const segs = buildNarrationSegments([
      {id: 'saludo', narration: 'Buenos días.'},
      {id: 'explicacion', narration: 'Vamos a revisar.'},
      {id: 'cierre-schema', narration: ''},
    ]);
    expect(segs).toHaveLength(2);
    expect(segs.map((s) => s.sceneId)).toEqual(['saludo', 'explicacion']);
  });
});
