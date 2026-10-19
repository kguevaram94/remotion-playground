import path from 'node:path';
import {existsSync, readFileSync} from 'node:fs';
import {renderMedia, selectComposition} from '@remotion/renderer';
import type {AppConfig} from '../config/env';
import {parseVideoScript} from '../domain/script.schema';
import {resolveJobBackgroundMusic} from '../media/bg-music';
import {getOrCreateServeUrl} from '../media/bundle-cache';
import {
  ensureNarrationLoudnorm,
  resolveNarrationForRender,
} from '../media/narration-loudnorm';
import {publishNarrationAudio} from '../media/public-audio';
import {parseSrt} from '../subtitles/srt';
import type {JobRecord, JobStore} from '../storage/job-store';
import {secondsToFrames} from '../utils/timing';

export type RenderOptions = {
  preview?: boolean;
};

export const runRenderVideo = async (
  store: JobStore,
  job: JobRecord,
  config: AppConfig,
  options: RenderOptions = {},
): Promise<JobRecord> => {
  store.setPhase(job, 'rendering', {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  store.save(job);

  try {
    const raw = store.readScript(job.id);
    if (!raw) throw new Error('No hay script.json');
    const script = parseVideoScript(raw);

    const preview = Boolean(options.preview);
    const scale = preview ? config.previewScale : 1;
    const width = Math.round(config.width * scale);
    const height = Math.round(config.height * scale);
    const evenWidth = width % 2 === 0 ? width : width - 1;
    const evenHeight = height % 2 === 0 ? height : height - 1;

    const durationSeconds =
      job.render?.durationSeconds ??
      script.scenes.reduce((a, s) => a + s.durationSeconds, 0);
    const durationInFrames = secondsToFrames(durationSeconds, config.fps);

    const subtitles =
      job.artifacts.subtitlesSrt && existsSync(job.artifacts.subtitlesSrt)
        ? parseSrt(readFileSync(job.artifacts.subtitlesSrt, 'utf8')).map(
            (c) => ({
              startMs: c.startMs,
              endMs: c.endMs,
              text: c.text,
            }),
          )
        : [];

    const voiceMetaPath = path.join(store.jobDir(job.id), 'voice-meta.json');
    let subtitleWords: Array<{text: string; startMs: number; endMs: number}> =
      [];
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

    let audioPublicFile: string | null = null;
    if (
      job.artifacts.narrationAudio &&
      existsSync(job.artifacts.narrationAudio) &&
      !job.audioIsTest &&
      !(
        job.artifacts.narrationLoudnorm &&
        existsSync(job.artifacts.narrationLoudnorm)
      )
    ) {
      const ln = ensureNarrationLoudnorm({
        jobDir: store.jobDir(job.id),
        narrationAudio: job.artifacts.narrationAudio,
        isTestAudio: false,
      });
      if (ln.applied && ln.loudnormPath) {
        job.artifacts.narrationLoudnorm = ln.loudnormPath;
      }
    }

    const narrationForRender = resolveNarrationForRender({
      narrationAudio: job.artifacts.narrationAudio,
      narrationLoudnorm: job.artifacts.narrationLoudnorm,
      isTestAudio: Boolean(job.audioIsTest),
    });
    if (narrationForRender) {
      audioPublicFile = publishNarrationAudio(job.id, narrationForRender);
      const usingLoudnorm =
        !job.audioIsTest &&
        job.artifacts.narrationLoudnorm === narrationForRender;
      process.stdout.write(
        `[shorts] Audio público: ${audioPublicFile}` +
          ` (voz=${job.providerMeta.voiceModel ?? config.voiceModel}` +
          `${usingLoudnorm ? ', loudnorm' : ''})\n`,
      );
    }

    let musicPublicFile: string | null = null;
    const music = resolveJobBackgroundMusic(job.id);
    if (music) {
      musicPublicFile = music.publicFile;
      process.stdout.write(
        `[shorts] Música de fondo: ${path.basename(music.sourcePath)} → ${musicPublicFile}\n`,
      );
    } else {
      job.warnings.push(
        'No hay pistas curadas en songs/catalog.json — el video se renderiza sin música de fondo. Ver songs/README.md.',
      );
    }

    const inputProps = {
      jobId: job.id,
      script,
      audioPublicFile,
      musicPublicFile,
      musicVolume: 0.12,
      subtitles,
      subtitleWords,
      isTestAudio: Boolean(job.audioIsTest),
    };

    const serveUrl = await getOrCreateServeUrl();

    const composition = await selectComposition({
      serveUrl,
      id: 'ShortVideo',
      inputProps,
    });

    const outputPath = path.join(
      store.jobDir(job.id),
      preview ? 'video-preview.mp4' : 'video.mp4',
    );

    await renderMedia({
      composition: {
        ...composition,
        width: evenWidth,
        height: evenHeight,
        fps: config.fps,
        durationInFrames: Math.max(durationInFrames, 1),
      },
      serveUrl,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      // Faster + stable on Apple Silicon; required later if we add @remotion/three
      chromiumOptions: {
        gl: 'angle',
      },
      concurrency: null,
    });

    job.artifacts.videoMp4 = outputPath;
    job.render = {
      durationSeconds,
      fps: config.fps,
      width: evenWidth,
      height: evenHeight,
      preview,
    };

    store.setPhase(job, 'rendering', {
      status: 'done',
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    return job;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.setPhase(job, 'rendering', {
      status: 'failed',
      error: message,
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    throw err;
  }
};
