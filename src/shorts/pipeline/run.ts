import path from 'node:path';
import {existsSync, readFileSync} from 'node:fs';
import {loadConfig, assertConfigForMode, type AppConfig} from '../config/env';
import {makeJobId} from '../utils/ids';
import {
  JobStore,
  createEmptyJob,
  VOICE_DEPENDENT_PHASES,
  type JobRecord,
} from '../storage/job-store';
import {parseVideoScript} from '../domain/script.schema';
import {runGenerateScript} from './generate-script';
import {runValidateScript} from './validate-script';
import {runGenerateScenes} from './generate-scenes';
import {runGenerateVoice} from './generate-voice';
import {runGenerateSubtitles} from './generate-subtitles';
import {runRenderVideo} from './render-video';
import {runPostProcess} from './post-process';
import {runQualityCheck} from './quality-check';
import {resolveVoiceAlias} from '../voice/voices-es';

export type PipelineMode =
  | 'full'
  | 'script'
  | 'render'
  | 'preview'
  | 'resume'
  | 'validate'
  | 'voice'
  | 'post';

export type PipelineArgs = {
  title?: string;
  id?: string;
  input?: string;
  mode: PipelineMode;
  config?: AppConfig;
  voice?: string;
};

const log = (msg: string) => {
  process.stdout.write(`[shorts] ${msg}\n`);
};

const markCompleted = (store: JobStore, job: JobRecord): JobRecord => {
  store.setPhase(job, 'completed', {
    status: 'done',
    finishedAt: new Date().toISOString(),
  });
  job.status = 'completed';
  store.save(job);
  return job;
};

export const runPipeline = async (args: PipelineArgs): Promise<JobRecord> => {
  const config = args.config ?? loadConfig();
  if (args.voice) {
    config.voiceProvider = 'macos-say';
    config.voiceModel = resolveVoiceAlias(args.voice);
  }

  const store = new JobStore(config.outputDir);

  let title = args.title?.trim() || '';
  let id = args.id?.trim() || '';
  /** Script provided via --input (skip AI/template generation). */
  let inputScript: ReturnType<typeof parseVideoScript> | null = null;

  if (args.input) {
    const inputPath = path.resolve(args.input);
    if (!existsSync(inputPath)) {
      throw new Error(`No existe input: ${inputPath}`);
    }
    const data = JSON.parse(readFileSync(inputPath, 'utf8')) as {
      title?: string;
      id?: string;
      scenes?: unknown;
    };
    if (data.scenes) {
      inputScript = parseVideoScript(data);
      title = inputScript.title;
      id = args.id?.trim() || inputScript.id;
      if (id !== inputScript.id) {
        inputScript = {...inputScript, id};
      }
    } else {
      title = data.title || title;
      id = data.id || id || (title ? makeJobId(title) : '');
    }
  }

  if (!id && title) id = makeJobId(title);
  if (!id) throw new Error('Se requiere --id, --input o un título');

  let job = store.load(id);
  if (!job) {
    if (!title) throw new Error(`Trabajo ${id} no existe; indica un título`);
    job = createEmptyJob(id, title, config);
    store.save(job);
  } else if (title && job.title !== title && args.mode !== 'resume') {
    job.title = title;
  }

  // Ensure newer phases exist on old jobs
  if (!job.phases.post_process) {
    job.phases.post_process = {status: 'pending'};
  }

  if (!store.acquireLock(id)) {
    throw new Error(
      `El trabajo ${id} está bloqueado por otra ejecución. Espera o elimina output/${id}/.lock`,
    );
  }

  try {
    // Guion propio: no regenerar desde título; revalidar y re-renderizar
    if (inputScript) {
      const scriptPath = store.writeJson(id, 'script.json', inputScript);
      job.artifacts.scriptJson = scriptPath;
      job.artifacts.inputJson = store.writeJson(id, 'input.json', {
        title: job.title,
        id: job.id,
        source: 'input-script',
      });
      store.hashAndStore(job, 'script', inputScript);
      store.setPhase(job, 'generating_script', {
        status: 'done',
        finishedAt: new Date().toISOString(),
        inputHash: job.hashes.script,
      });
      store.invalidateFrom(job, 'validating');
      job.phases.completed = {status: 'pending'};
      store.save(job);
      log(`Guion propio cargado: ${scriptPath}`);
    }

    const needsAi = args.mode === 'full' || args.mode === 'script';
    const needsVoice =
      args.mode === 'full' ||
      args.mode === 'resume' ||
      args.mode === 'render' ||
      args.mode === 'voice';
    assertConfigForMode(
      config,
      needsAi && config.aiProvider !== 'template',
      needsVoice && config.voiceProvider === 'openai-tts',
    );

    if (args.mode === 'validate') {
      job = runValidateScript(store, job, config);
      log(`Validación OK (${job.validation?.level})`);
      return job;
    }

    if (args.mode === 'voice') {
      for (const phase of VOICE_DEPENDENT_PHASES) {
        job.phases[phase] = {status: 'pending'};
      }
      delete job.hashes.narrationText;
      store.save(job);
      log(`Regenerando voz (${config.voiceProvider}/${config.voiceModel})…`);
      job = await runGenerateVoice(store, job, config, {force: true});
      job = runGenerateSubtitles(store, job, config);
      job = await runRenderVideo(store, job, config, {preview: false});
      job = await runPostProcess(store, job, config);
      job = runQualityCheck(store, job, config);
      job = markCompleted(store, job);
      log(`Voz en vídeo: ${job.providerMeta.voiceModel}`);
      log(`Vídeo: ${job.artifacts.videoMp4}`);
      return job;
    }

    if (args.mode === 'post') {
      if (!job.artifacts.videoMp4) {
        throw new Error('No hay vídeo; renderiza primero');
      }
      job.phases.post_process = {status: 'pending'};
      job.phases.quality_check = {status: 'pending'};
      job.phases.completed = {status: 'pending'};
      log('Post-proceso (FFmpeg + Satori)…');
      job = await runPostProcess(store, job, config);
      job = runQualityCheck(store, job, config);
      job = markCompleted(store, job);
      return job;
    }

    if (args.mode === 'script') {
      log('Generando guion…');
      job = await runGenerateScript(store, job, config);
      log(`Guion listo: ${path.join(store.jobDir(id), 'script.json')}`);
      return job;
    }

    if (args.mode === 'render' || args.mode === 'preview') {
      if (!store.readScript(id)) {
        throw new Error('No hay script.json; genera primero con short:script');
      }
      if (!store.isPhaseDone(job, 'validating')) {
        log('Validando antes de render…');
        job = runValidateScript(store, job, config);
      }
      if (!store.isPhaseDone(job, 'planning_scenes')) {
        job = runGenerateScenes(store, job, config);
      }
      if (!job.artifacts.narrationAudio) {
        log('Generando voz…');
        job = await runGenerateVoice(store, job, config);
      }
      if (!job.artifacts.subtitlesSrt) {
        log('Generando subtítulos…');
        job = runGenerateSubtitles(store, job, config);
      }
      log(args.mode === 'preview' ? 'Render preview…' : 'Renderizando…');
      job = await runRenderVideo(store, job, config, {
        preview: args.mode === 'preview',
      });
      if (args.mode === 'render') {
        job = await runPostProcess(store, job, config);
        job = runQualityCheck(store, job, config);
        job = markCompleted(store, job);
      }
      log(`Vídeo: ${job.artifacts.videoMp4}`);
      return job;
    }

    // full / resume
    if (!store.isPhaseDone(job, 'generating_script')) {
      log('Generando guion…');
      job = await runGenerateScript(store, job, config);
    }
    if (!store.isPhaseDone(job, 'validating')) {
      log('Validando acertijo…');
      job = runValidateScript(store, job, config);
    }
    if (!store.isPhaseDone(job, 'planning_scenes')) {
      log('Planificando escenas…');
      job = runGenerateScenes(store, job, config);
    }
    if (!store.isPhaseDone(job, 'generating_voice')) {
      log('Generando voz…');
      job = await runGenerateVoice(store, job, config);
    }
    if (!store.isPhaseDone(job, 'generating_subtitles')) {
      log('Generando subtítulos…');
      job = runGenerateSubtitles(store, job, config);
    }
    if (!store.isPhaseDone(job, 'rendering')) {
      log('Renderizando…');
      job = await runRenderVideo(store, job, config, {preview: false});
    }
    if (!store.isPhaseDone(job, 'post_process')) {
      log('Post-proceso (FFmpeg + Satori)…');
      job = await runPostProcess(store, job, config);
    }
    if (!store.isPhaseDone(job, 'quality_check')) {
      log('Control de calidad…');
      job = runQualityCheck(store, job, config);
    }
    if (!store.isPhaseDone(job, 'completed')) {
      job = markCompleted(store, job);
    }

    log(`Completado: ${store.jobDir(id)}`);
    return job;
  } finally {
    store.releaseLock(id);
  }
};
