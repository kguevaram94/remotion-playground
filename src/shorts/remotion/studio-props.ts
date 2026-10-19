import {existsSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {parseVideoScript} from '../domain/script.schema';
import {parseSrt} from '../subtitles/srt';
import type {StudioShortVideoProps} from './studio-defaults';

const findPublishedNarration = (jobId: string): string | null => {
  const dir = path.join(process.cwd(), 'public', 'shorts', jobId);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) =>
    /^narration(-[a-f0-9]+)?\.wav$/i.test(f),
  );
  if (!files.length) return null;
  files.sort();
  return path.join('shorts', jobId, files[files.length - 1]).replace(/\\/g, '/');
};

const findPublishedMusic = (jobId: string): string | null => {
  const dir = path.join(process.cwd(), 'public', 'shorts', jobId);
  if (!existsSync(dir)) return null;
  const file = readdirSync(dir).find((f) => /^bg\./i.test(f));
  if (!file) return null;
  return path.join('shorts', jobId, file).replace(/\\/g, '/');
};

export type BuildStudioPropsOptions = {
  jobId: string;
  jobDir: string;
  /** Absolute path to script.json */
  scriptPath: string;
  isTestAudio?: boolean;
};

/**
 * Build ShortVideo props for Remotion Studio from an existing job directory.
 */
export const buildStudioPropsFromJob = (
  options: BuildStudioPropsOptions,
): StudioShortVideoProps => {
  if (!existsSync(options.scriptPath)) {
    throw new Error(`No hay script.json en ${options.scriptPath}`);
  }
  const raw = JSON.parse(readFileSync(options.scriptPath, 'utf8')) as unknown;
  const script = parseVideoScript(raw);

  const srtPath = path.join(options.jobDir, 'subtitles.srt');
  const subtitles =
    existsSync(srtPath)
      ? parseSrt(readFileSync(srtPath, 'utf8')).map((c) => ({
          startMs: c.startMs,
          endMs: c.endMs,
          text: c.text,
        }))
      : [];

  const voiceMetaPath = path.join(options.jobDir, 'voice-meta.json');
  let subtitleWords: Array<{text: string; startMs: number; endMs: number}> = [];
  if (existsSync(voiceMetaPath)) {
    try {
      const meta = JSON.parse(readFileSync(voiceMetaPath, 'utf8')) as {
        cues?: Array<{text: string; startMs: number; endMs: number}>;
      };
      subtitleWords = meta.cues ?? [];
    } catch {
      subtitleWords = [];
    }
  }

  return {
    jobId: options.jobId,
    script,
    audioPublicFile: findPublishedNarration(options.jobId),
    musicPublicFile: findPublishedMusic(options.jobId),
    musicVolume: 0.12,
    subtitles,
    subtitleWords,
    isTestAudio: Boolean(options.isTestAudio),
  };
};

export const writeStudioPropsFile = (
  props: StudioShortVideoProps,
  outputPath: string,
): string => {
  writeFileSync(outputPath, JSON.stringify(props, null, 2) + '\n', 'utf8');
  return outputPath;
};
