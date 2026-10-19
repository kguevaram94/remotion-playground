import {createHash} from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import path from 'node:path';

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg)$/i;

export const listSongFiles = (songsDir?: string): string[] => {
  const dir = songsDir ?? path.join(process.cwd(), 'songs');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => AUDIO_EXT.test(f))
    .sort()
    .map((f) => path.join(dir, f));
};

/** Deterministic pick from songs/ based on jobId. */
export const pickBackgroundTrack = (
  jobId: string,
  songsDir?: string,
): string | null => {
  const files = listSongFiles(songsDir);
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
