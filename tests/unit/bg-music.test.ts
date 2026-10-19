import {describe, expect, it} from 'vitest';
import path from 'node:path';
import {listSongFiles, pickBackgroundTrack} from '../../src/shorts/media/bg-music';

describe('bg-music', () => {
  it('lists tracks from songs/', () => {
    const songs = listSongFiles(path.join(process.cwd(), 'songs'));
    expect(songs.length).toBeGreaterThan(0);
  });

  it('picks deterministically by jobId', () => {
    const a = pickBackgroundTrack('puntos');
    const b = pickBackgroundTrack('puntos');
    const c = pickBackgroundTrack('other-job');
    expect(a).toBe(b);
    expect(a).toBeTruthy();
    // different jobs may collide but usually differ
    expect(typeof c).toBe('string');
  });
});
