import path from 'node:path';
import {existsSync, copyFileSync} from 'node:fs';
import type {AppConfig} from '../config/env';
import {
  extractFrame,
  loudnormAudio,
  makePreviewMp4,
  probeMedia,
} from '../media/ffmpeg';
import {renderThumbnailPng} from '../media/thumbnail';
import type {JobRecord, JobStore} from '../storage/job-store';

export const runPostProcess = async (
  store: JobStore,
  job: JobRecord,
  config: AppConfig,
): Promise<JobRecord> => {
  store.setPhase(job, 'post_process', {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  store.save(job);

  try {
    const script = store.readScript(job.id);
    const videoPath = job.artifacts.videoMp4;
    if (!videoPath || !existsSync(videoPath)) {
      throw new Error('No hay video.mp4 para post-procesar');
    }

    const jobDir = store.jobDir(job.id);
    const artifacts: string[] = [];

    // 1) Cover art with Satori (declarative, no Chromium)
    const thumbPath = path.join(jobDir, 'thumbnail.png');
    await renderThumbnailPng(
      {
        title: script?.title || job.title,
        hook: script?.hook,
        badge: script?.format?.toUpperCase() || 'SHORT',
        width: config.width,
        height: config.height,
      },
      thumbPath,
    );
    job.artifacts.thumbnailPng = thumbPath;
    artifacts.push(thumbPath);

    // 2) Frame grab near reveal (~60% into video) via FFmpeg
    const duration =
      job.render?.durationSeconds ??
      probeMedia(videoPath).duration ??
      10;
    const framePath = path.join(jobDir, 'frame-reveal.jpg');
    if (extractFrame(videoPath, framePath, duration * 0.62)) {
      job.artifacts.frameRevealJpg = framePath;
      artifacts.push(framePath);
    } else {
      job.warnings.push('No se pudo extraer frame-reveal.jpg con FFmpeg');
    }

    // 3) Lightweight preview for WhatsApp / review
    const previewPath = path.join(jobDir, 'video-preview.mp4');
    if (makePreviewMp4(videoPath, previewPath, config.previewScale)) {
      job.artifacts.videoPreviewMp4 = previewPath;
      artifacts.push(previewPath);
    } else {
      job.warnings.push('No se pudo generar video-preview.mp4');
    }

    // 4) Loudnorm sidecar should already exist from voice/render; ensure once more
    if (
      job.artifacts.narrationAudio &&
      existsSync(job.artifacts.narrationAudio) &&
      !job.audioIsTest
    ) {
      const normalized =
        job.artifacts.narrationLoudnorm &&
        existsSync(job.artifacts.narrationLoudnorm)
          ? job.artifacts.narrationLoudnorm
          : path.join(jobDir, 'narration-loudnorm.wav');
      if (
        !existsSync(normalized) &&
        loudnormAudio(job.artifacts.narrationAudio, normalized)
      ) {
        job.artifacts.narrationLoudnorm = normalized;
      }
      if (
        job.artifacts.narrationLoudnorm &&
        existsSync(job.artifacts.narrationLoudnorm)
      ) {
        artifacts.push(job.artifacts.narrationLoudnorm);
      }
    }

    // 5) Probe summary for metadata
    const probe = probeMedia(videoPath);
    store.writeJson(job.id, 'probe.json', probe);
    job.artifacts.probeJson = path.join(jobDir, 'probe.json');

    // Keep a copy of thumbnail in assets/
    const assetsThumb = path.join(jobDir, 'assets', 'thumbnail.png');
    copyFileSync(thumbPath, assetsThumb);

    store.writeJson(job.id, 'post-process.json', {
      artifacts,
      probe,
      at: new Date().toISOString(),
    });

    store.setPhase(job, 'post_process', {
      status: 'done',
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    return job;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.setPhase(job, 'post_process', {
      status: 'failed',
      error: message,
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    throw err;
  }
};
