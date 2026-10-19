import {createHash} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';

const CACHE_DIR = path.join(process.cwd(), 'node_modules', '.cache', 'shorts');
const CACHE_FILE = path.join(CACHE_DIR, 'bundle.json');

type BundleCache = {
  entryHash: string;
  serveUrl: string;
  createdAt: string;
};

const hashFile = (file: string, hash: ReturnType<typeof createHash>) => {
  if (existsSync(file)) hash.update(readFileSync(file));
};

/** Fingerprint public audio so new narrations / SFX / music force a fresh copy. */
const hashPublicAudio = (hash: ReturnType<typeof createHash>) => {
  const roots = [
    path.join(process.cwd(), 'public', 'shorts'),
    path.join(process.cwd(), 'public', 'sfx'),
  ];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else {
        hash.update(full);
        hash.update(String(st.size));
        hash.update(String(st.mtimeMs));
        if (/\.(wav|mp3|aiff|m4a)$/i.test(name)) {
          hash.update(readFileSync(full));
        }
      }
    }
  };
  for (const root of roots) walk(root);
};

const hashEntry = (entry: string): string => {
  const hash = createHash('sha1');
  const roots = [
    entry,
    path.join(process.cwd(), 'package.json'),
    path.join(process.cwd(), 'src/Composition.tsx'),
    path.join(process.cwd(), 'src/shorts/remotion/compositions/ShortVideo.tsx'),
    path.join(process.cwd(), 'src/shorts/remotion/components/SubtitleTrack.tsx'),
    path.join(process.cwd(), 'src/shorts/subtitles/subtitle-sentences.ts'),
    path.join(process.cwd(), 'src/shorts/remotion/theme.ts'),
  ];
  for (const file of roots) hashFile(file, hash);
  hashPublicAudio(hash);
  return hash.digest('hex');
};

export const invalidateBundleCache = (): void => {
  if (existsSync(CACHE_FILE)) {
    try {
      const {unlinkSync} = require('node:fs') as typeof import('node:fs');
      unlinkSync(CACHE_FILE);
    } catch {
      // ignore
    }
  }
};

/**
 * Reuse webpack/rspack bundle when entry + public narration assets are unchanged.
 * Remotion copies `public/` into the serve folder at bundle time — if we keep an
 * old serveUrl, new voices 404 or keep serving the first narration forever.
 */
export const getOrCreateServeUrl = async (
  entryPoint = path.join(process.cwd(), 'src/index.ts'),
): Promise<string> => {
  mkdirSync(CACHE_DIR, {recursive: true});
  const entryHash = hashEntry(entryPoint);

  if (existsSync(CACHE_FILE)) {
    try {
      const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as BundleCache;
      if (cached.entryHash === entryHash && cached.serveUrl) {
        process.stdout.write('[shorts] Reutilizando bundle Remotion (caché)\n');
        return cached.serveUrl;
      }
    } catch {
      // rebuild
    }
  }

  process.stdout.write('[shorts] Empaquetando Remotion (public/ actualizado)…\n');
  const serveUrl = await bundle({
    entryPoint,
    enableCaching: true,
    webpackOverride: (webpackConfig) => webpackConfig,
  });

  const payload: BundleCache = {
    entryHash,
    serveUrl,
    createdAt: new Date().toISOString(),
  };
  writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2));
  return serveUrl;
};
