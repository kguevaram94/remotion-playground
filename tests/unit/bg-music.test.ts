import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {writeFileSync, rmSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  listCuratedSongFiles,
  listSongFiles,
  loadSongCatalog,
  pickBackgroundTrack,
} from '../../src/shorts/media/bg-music';

describe('bg-music curated catalog', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'songs-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('loads empty catalog when catalog.json has no tracks', () => {
    writeFileSync(
      path.join(dir, 'catalog.json'),
      JSON.stringify({version: 1, tracks: []}),
    );
    writeFileSync(path.join(dir, 'unverified.mp3'), 'fake');
    expect(loadSongCatalog(dir).tracks).toHaveLength(0);
    expect(listSongFiles(dir).length).toBe(1);
    expect(listCuratedSongFiles(dir)).toHaveLength(0);
    expect(pickBackgroundTrack('job-a', dir)).toBeNull();
  });

  it('ignores tracks missing license or source', () => {
    writeFileSync(path.join(dir, 'ok.mp3'), 'a');
    writeFileSync(path.join(dir, 'bad.mp3'), 'b');
    writeFileSync(
      path.join(dir, 'catalog.json'),
      JSON.stringify({
        version: 1,
        tracks: [
          {file: 'ok.mp3', source: 'https://example.com', license: 'CC0-1.0'},
          {file: 'bad.mp3', source: '', license: 'CC0-1.0'},
          {file: 'missing.mp3', source: 'https://x', license: 'CC0-1.0'},
        ],
      }),
    );
    const curated = listCuratedSongFiles(dir);
    expect(curated).toHaveLength(1);
    expect(path.basename(curated[0]!)).toBe('ok.mp3');
  });

  it('picks deterministically among curated files only', () => {
    writeFileSync(path.join(dir, 'a.mp3'), 'a');
    writeFileSync(path.join(dir, 'b.mp3'), 'b');
    writeFileSync(path.join(dir, 'orphan.mp3'), 'c');
    writeFileSync(
      path.join(dir, 'catalog.json'),
      JSON.stringify({
        tracks: [
          {file: 'a.mp3', source: 'https://a', license: 'CC0-1.0'},
          {file: 'b.mp3', source: 'https://b', license: 'CC0-1.0'},
        ],
      }),
    );
    const first = pickBackgroundTrack('puntos', dir);
    const second = pickBackgroundTrack('puntos', dir);
    expect(first).toBe(second);
    expect(first).toBeTruthy();
    expect(['a.mp3', 'b.mp3']).toContain(path.basename(first!));
    expect(path.basename(first!)).not.toBe('orphan.mp3');
  });
});

describe('bg-music repo songs/', () => {
  it('repo catalog excludes unverified output*.mp3 from curated pool', () => {
    const songs = path.join(process.cwd(), 'songs');
    const catalog = loadSongCatalog(songs);
    expect(catalog.tracks).toHaveLength(0);
    expect(listCuratedSongFiles(songs)).toHaveLength(0);
    expect(pickBackgroundTrack('s4-19-interruptores', songs)).toBeNull();
    // Disk may still hold legacy files; they must not be curated.
    expect(listSongFiles(songs).length).toBeGreaterThan(0);
  });
});
