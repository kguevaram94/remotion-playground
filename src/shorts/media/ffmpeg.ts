import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';

export type ProbeResult = {
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio?: boolean;
  sizeBytes?: number;
  raw?: unknown;
};

const runRemotionBinary = (
  binary: 'ffmpeg' | 'ffprobe',
  args: string[],
): {ok: boolean; stdout: string; stderr: string; status: number | null} => {
  const result = spawnSync('npx', ['remotion', binary, ...args], {
    encoding: 'utf8',
    cwd: process.cwd(),
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
};

/** Prefer system ffmpeg/ffprobe when present; fall back to Remotion-bundled. */
export const runFfmpeg = (
  args: string[],
): {ok: boolean; stdout: string; stderr: string} => {
  const system = spawnSync('ffmpeg', args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (system.error?.message.includes('ENOENT') || system.status === null) {
    const rem = runRemotionBinary('ffmpeg', args);
    return {ok: rem.ok, stdout: rem.stdout, stderr: rem.stderr};
  }
  return {
    ok: system.status === 0,
    stdout: system.stdout || '',
    stderr: system.stderr || '',
  };
};

export const runFfprobe = (
  args: string[],
): {ok: boolean; stdout: string; stderr: string} => {
  const system = spawnSync('ffprobe', args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (system.error?.message.includes('ENOENT') || system.status === null) {
    const rem = runRemotionBinary('ffprobe', args);
    return {ok: rem.ok, stdout: rem.stdout, stderr: rem.stderr};
  }
  return {
    ok: system.status === 0,
    stdout: system.stdout || '',
    stderr: system.stderr || '',
  };
};

export const probeMedia = (filePath: string): ProbeResult => {
  if (!existsSync(filePath)) return {};
  const result = runFfprobe([
    '-v',
    'error',
    '-show_entries',
    'format=duration,size:stream=width,height,r_frame_rate,codec_type',
    '-of',
    'json',
    filePath,
  ]);
  if (!result.ok) return {};
  try {
    const json = JSON.parse(result.stdout) as {
      format?: {duration?: string; size?: string};
      streams?: Array<{
        width?: number;
        height?: number;
        r_frame_rate?: string;
        codec_type?: string;
      }>;
    };
    const video = json.streams?.find((s) => s.codec_type === 'video');
    const hasAudio = Boolean(
      json.streams?.some((s) => s.codec_type === 'audio'),
    );
    let fps: number | undefined;
    if (video?.r_frame_rate?.includes('/')) {
      const [a, b] = video.r_frame_rate.split('/').map(Number);
      if (a && b) fps = a / b;
    }
    return {
      duration: Number(json.format?.duration || NaN) || undefined,
      width: video?.width,
      height: video?.height,
      fps,
      hasAudio,
      sizeBytes: Number(json.format?.size || NaN) || undefined,
      raw: json,
    };
  } catch {
    return {};
  }
};

/** Extract a JPEG frame at `atSeconds` for thumbnails / QC. */
export const extractFrame = (
  videoPath: string,
  outputJpg: string,
  atSeconds: number,
): boolean => {
  const result = runFfmpeg([
    '-y',
    '-ss',
    String(Math.max(0, atSeconds)),
    '-i',
    videoPath,
    '-frames:v',
    '1',
    '-q:v',
    '2',
    outputJpg,
  ]);
  return result.ok && existsSync(outputJpg);
};

/** Fast social preview: half resolution, CRF 28, AAC. */
export const makePreviewMp4 = (
  videoPath: string,
  outputPath: string,
  scale = 0.5,
): boolean => {
  const result = runFfmpeg([
    '-y',
    '-i',
    videoPath,
    '-vf',
    `scale=trunc(iw*${scale}/2)*2:trunc(ih*${scale}/2)*2`,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '28',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    outputPath,
  ]);
  return result.ok && existsSync(outputPath);
};

/** Soft loudness normalize for narration (EBU R128 approx). */
export const loudnormAudio = (
  inputWav: string,
  outputWav: string,
): boolean => {
  const result = runFfmpeg([
    '-y',
    '-i',
    inputWav,
    '-af',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
    outputWav,
  ]);
  return result.ok && existsSync(outputWav);
};

export const ffmpegAvailable = (): boolean => {
  const probe = runFfprobe(['-version']);
  return probe.ok || probe.stdout.includes('ffprobe') || probe.stderr.includes('ffprobe');
};

export const joinJobAsset = (jobDir: string, name: string) =>
  path.join(jobDir, name);
