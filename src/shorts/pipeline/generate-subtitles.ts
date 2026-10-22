import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import type {AppConfig} from '../config/env';
import {
  alignCuesToAudio,
  buildSubtitlesFromScenes,
  cuesToSrt,
} from '../subtitles/srt';
import {planScenes} from '../ai/scene-planner';
import {isSingleTakeVoiceMeta} from '../voice/single-take';
import type {JobRecord, JobStore} from '../storage/job-store';

export const runGenerateSubtitles = (
  store: JobStore,
  job: JobRecord,
  config: AppConfig,
): JobRecord => {
  store.setPhase(job, 'generating_subtitles', {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  store.save(job);

  try {
    const script = store.readScript(job.id);
    if (!script) throw new Error('No hay script.json');

    const voiceMetaPath = path.join(store.jobDir(job.id), 'voice-meta.json');
    let narrationDuration = script.targetDurationSeconds;
    let wordCues: Array<{text: string; startMs: number; endMs: number}> = [];

    let voiceSegments:
      | Array<{
          sceneId: string;
          durationSeconds: number;
          pauseAfterSec: number;
        }>
      | undefined;

    let singleTake = config.voiceProvider === 'file';

    if (existsSync(voiceMetaPath)) {
      const meta = JSON.parse(readFileSync(voiceMetaPath, 'utf8')) as {
        durationSeconds: number;
        provider?: string;
        timingMode?: string;
        cuesKind?: string;
        cues?: Array<{text: string; startMs: number; endMs: number}>;
        segments?: Array<{
          sceneId?: string;
          durationSeconds?: number;
          pauseAfterSec?: number;
        }>;
      };
      narrationDuration = meta.durationSeconds;
      wordCues = meta.cues ?? [];
      singleTake = isSingleTakeVoiceMeta(meta, config.voiceProvider);
      // Legacy file equal-split segments must not drive scene durations.
      if (
        !singleTake &&
        meta.segments?.length &&
        meta.segments.every(
          (s) =>
            typeof s.sceneId === 'string' &&
            typeof s.durationSeconds === 'number',
        )
      ) {
        voiceSegments = meta.segments.map((s) => ({
          sceneId: s.sceneId!,
          durationSeconds: s.durationSeconds!,
          pauseAfterSec: s.pauseAfterSec ?? 0,
        }));
      }
    }

    // measured-segments: lock to TTS parts; single-take: keep script + match WAV
    const planned = planScenes(script, {
      targetDurationSeconds: config.targetDurationSeconds,
      maxDurationSeconds: config.maxDurationSeconds,
      narrationDurationSeconds: narrationDuration,
      voiceSegments: singleTake ? undefined : voiceSegments,
      voiceTimingMode: singleTake ? 'single-take' : undefined,
    });

    const cues =
      wordCues.length > 0
        ? alignCuesToAudio(
            planned.scenes.map((s) => s.subtitleText),
            wordCues,
            Math.round(narrationDuration * 1000),
          )
        : buildSubtitlesFromScenes(planned.scenes);

    // Clamp cues to the longer of planned scenes vs narration (never crush tails)
    const sceneMs = Math.round(
      planned.scenes.reduce((a, s) => a + s.durationSeconds, 0) * 1000,
    );
    const totalMs = Math.max(sceneMs, Math.round(narrationDuration * 1000));
    for (const cue of cues) {
      if (cue.endMs > totalMs) cue.endMs = totalMs;
      if (cue.startMs > totalMs) {
        cue.startMs = Math.max(0, totalMs - 200);
        cue.endMs = totalMs;
      }
    }

    const srt = cuesToSrt(cues);
    const srtPath = store.writeText(job.id, 'subtitles.srt', srt);
    job.artifacts.subtitlesSrt = srtPath;

    store.writeJson(job.id, 'script.json', planned);
    store.writeJson(job.id, 'scenes.json', {
      id: planned.id,
      scenes: planned.scenes,
      totalDurationSeconds: planned.scenes.reduce(
        (a, s) => a + s.durationSeconds,
        0,
      ),
    });
    job.artifacts.scriptJson = path.join(store.jobDir(job.id), 'script.json');
    job.artifacts.scenesJson = path.join(store.jobDir(job.id), 'scenes.json');
    job.render = {
      ...job.render,
      durationSeconds: planned.scenes.reduce((a, s) => a + s.durationSeconds, 0),
      fps: config.fps,
      width: config.width,
      height: config.height,
    };

    store.setPhase(job, 'generating_subtitles', {
      status: 'done',
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    return job;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.setPhase(job, 'generating_subtitles', {
      status: 'failed',
      error: message,
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    throw err;
  }
};
