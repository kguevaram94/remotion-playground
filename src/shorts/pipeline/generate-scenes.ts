import type {AppConfig} from '../config/env';
import {planScenes} from '../ai/scene-planner';
import {parseVideoScript} from '../domain/script.schema';
import type {JobRecord, JobStore} from '../storage/job-store';

export const runGenerateScenes = (
  store: JobStore,
  job: JobRecord,
  config: AppConfig,
  narrationDurationSeconds?: number,
): JobRecord => {
  store.setPhase(job, 'planning_scenes', {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  store.save(job);

  try {
    const raw = store.readScript(job.id);
    if (!raw) throw new Error('No hay script.json');
    const script = parseVideoScript(raw);
    // file = single-take: keep authorship durations; do not stretch to SHORTS_TARGET_DURATION.
    const voiceTimingMode =
      config.voiceProvider === 'file' ? ('single-take' as const) : undefined;
    const planned = planScenes(script, {
      targetDurationSeconds: config.targetDurationSeconds,
      maxDurationSeconds: config.maxDurationSeconds,
      narrationDurationSeconds,
      voiceTimingMode,
    });

    const scenesPath = store.writeJson(job.id, 'scenes.json', {
      id: planned.id,
      scenes: planned.scenes,
      totalDurationSeconds: planned.targetDurationSeconds,
    });
    const scriptPath = store.writeJson(job.id, 'script.json', planned);
    job.artifacts.scenesJson = scenesPath;
    job.artifacts.scriptJson = scriptPath;
    store.hashAndStore(job, 'scenes', planned.scenes);

    store.setPhase(job, 'planning_scenes', {
      status: 'done',
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    return job;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.setPhase(job, 'planning_scenes', {
      status: 'failed',
      error: message,
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    throw err;
  }
};
