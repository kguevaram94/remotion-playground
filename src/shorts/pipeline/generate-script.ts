import type {AppConfig} from '../config/env';
import {generateScript} from '../ai/script-generator';
import type {JobRecord, JobStore} from '../storage/job-store';

export const runGenerateScript = async (
  store: JobStore,
  job: JobRecord,
  config: AppConfig,
): Promise<JobRecord> => {
  store.setPhase(job, 'generating_script', {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  store.save(job);

  try {
    const {script, provider, model} = await generateScript({
      title: job.title,
      id: job.id,
      config,
    });

    const scriptPath = store.writeJson(job.id, 'script.json', script);
    store.writeJson(job.id, 'input.json', {
      title: job.title,
      id: job.id,
      createdAt: job.createdAt,
    });

    job.artifacts.scriptJson = scriptPath;
    job.artifacts.inputJson = store.writeJson(job.id, 'input.json', {
      title: job.title,
      id: job.id,
    });
    job.providerMeta.aiProvider = provider;
    job.providerMeta.aiModel = model;
    store.hashAndStore(job, 'script', script);

    store.setPhase(job, 'generating_script', {
      status: 'done',
      finishedAt: new Date().toISOString(),
      inputHash: job.hashes.script,
    });
    store.save(job);
    return job;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.setPhase(job, 'generating_script', {
      status: 'failed',
      error: message,
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    throw err;
  }
};
