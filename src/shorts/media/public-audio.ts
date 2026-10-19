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

/**
 * Copy narration into public/ with a content hash in the filename.
 * Remotion caches assets by URL; a fixed `narration.wav` path kept serving
 * the first voice even after regenerating the file on disk.
 */
export const publishNarrationAudio = (
  jobId: string,
  sourceAudioPath: string,
): string => {
  const buf = readFileSync(sourceAudioPath);
  const hash = createHash('sha1').update(buf).digest('hex').slice(0, 12);
  const dirRel = path.join('shorts', jobId);
  const dirAbs = path.join(process.cwd(), 'public', dirRel);
  mkdirSync(dirAbs, {recursive: true});

  // Remove previous hashed narrations for this job
  for (const file of readdirSync(dirAbs)) {
    if (/^narration(-[a-f0-9]+)?\.wav$/i.test(file)) {
      try {
        unlinkSync(path.join(dirAbs, file));
      } catch {
        // ignore
      }
    }
  }

  const fileName = `narration-${hash}.wav`;
  const abs = path.join(dirAbs, fileName);
  copyFileSync(sourceAudioPath, abs);

  // Stable symlink-like copy for debugging (optional peek)
  copyFileSync(sourceAudioPath, path.join(dirAbs, 'narration-latest.wav'));

  return path.join(dirRel, fileName).replace(/\\/g, '/');
};

export const clearPublishedNarration = (jobId: string): void => {
  const dirAbs = path.join(process.cwd(), 'public', 'shorts', jobId);
  if (!existsSync(dirAbs)) return;
  for (const file of readdirSync(dirAbs)) {
    if (file.startsWith('narration')) {
      try {
        unlinkSync(path.join(dirAbs, file));
      } catch {
        // ignore
      }
    }
  }
};
