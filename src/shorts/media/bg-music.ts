import {createHash} from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
import path from 'node:path';

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg)$/i;

export type SongCatalogEntry = {
  file: string;
  title?: string;
  source: string;
  license: string;
  licenseUrl?: string;
  attribution?: string;
  notes?: string;
};

export type SongCatalog = {
  version?: number;
  description?: string;
  tracks: SongCatalogEntry[];
};

const defaultSongsDir = (): string => path.join(process.cwd(), 'songs');

/** Raw audio files on disk (may include unverified tracks). Prefer curated helpers. */
export const listSongFiles = (songsDir?: string): string[] => {
  const dir = songsDir ?? defaultSongsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => AUDIO_EXT.test(f))
    .sort()
    .map((f) => path.join(dir, f));
};

export const loadSongCatalog = (songsDir?: string): SongCatalog => {
  const dir = songsDir ?? defaultSongsDir();
  const catalogPath = path.join(dir, 'catalog.json');
  if (!existsSync(catalogPath)) {
    return {version: 1, tracks: []};
  }
  try {
    const raw = JSON.parse(readFileSync(catalogPath, 'utf8')) as Partial<SongCatalog>;
    const tracks = Array.isArray(raw.tracks) ? raw.tracks : [];
    return {
      version: raw.version ?? 1,
      description: raw.description,
      tracks: tracks.filter(
        (t): t is SongCatalogEntry =>
          Boolean(t && typeof t.file === 'string' && t.file.trim()) &&
          Boolean(t.source?.trim()) &&
          Boolean(t.license?.trim()),
      ),
    };
  } catch {
    return {version: 1, tracks: []};
  }
};

/**
 * Absolute paths of curated tracks that exist on disk.
 * Entries missing license fields or missing files are skipped.
 */
export const listCuratedSongFiles = (songsDir?: string): string[] => {
  const dir = songsDir ?? defaultSongsDir();
  const {tracks} = loadSongCatalog(dir);
  const out: string[] = [];
  for (const track of tracks) {
    const abs = path.join(dir, track.file);
    if (existsSync(abs) && AUDIO_EXT.test(track.file)) {
      out.push(abs);
    }
  }
  return out.sort();
};

/** Deterministic pick from curated catalog based on jobId. */
export const pickBackgroundTrack = (
  jobId: string,
  songsDir?: string,
): string | null => {
  const files = listCuratedSongFiles(songsDir);
  if (!files.length) return null;
  const hash = createHash('sha1').update(jobId).digest();
  const idx = hash[0]! % files.length;
  return files[idx]!;
};

/**
 * Copy chosen track into public/shorts/<jobId>/bg.<ext>
 * Returns path relative to public/ for staticFile().
 */
export const publishBackgroundMusic = (
  jobId: string,
  sourcePath: string,
): string => {
  const ext = path.extname(sourcePath).toLowerCase() || '.mp3';
  const dirRel = path.join('shorts', jobId);
  const dirAbs = path.join(process.cwd(), 'public', dirRel);
  mkdirSync(dirAbs, {recursive: true});

  for (const file of readdirSync(dirAbs)) {
    if (/^bg\./i.test(file)) {
      try {
        unlinkSync(path.join(dirAbs, file));
      } catch {
        // ignore
      }
    }
  }

  const fileName = `bg${ext}`;
  copyFileSync(sourcePath, path.join(dirAbs, fileName));
  return path.join(dirRel, fileName).replace(/\\/g, '/');
};

export const resolveJobBackgroundMusic = (
  jobId: string,
): {sourcePath: string; publicFile: string} | null => {
  const source = pickBackgroundTrack(jobId);
  if (!source) return null;
  const publicFile = publishBackgroundMusic(jobId, source);
  return {sourcePath: source, publicFile};
};
