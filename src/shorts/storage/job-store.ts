import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  openSync,
  closeSync,
} from 'node:fs';
import path from 'node:path';
import type {AppConfig} from '../config/env';
import type {VideoScript} from '../domain/script.schema';
import {hashContent} from '../utils/ids';

export type PhaseName =
  | 'pending'
  | 'generating_script'
  | 'validating'
  | 'planning_scenes'
  | 'generating_voice'
  | 'generating_subtitles'
  | 'rendering'
  | 'post_process'
  | 'quality_check'
  | 'completed'
  | 'failed';

export type PhaseState = {
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  inputHash?: string;
};

export type JobArtifacts = {
  inputJson?: string;
  scriptJson?: string;
  scenesJson?: string;
  narrationAudio?: string;
  narrationLoudnorm?: string;
  subtitlesSrt?: string;
  metadataJson?: string;
  reportJson?: string;
  videoMp4?: string;
  videoPreviewMp4?: string;
  thumbnailPng?: string;
  frameRevealJpg?: string;
  probeJson?: string;
  lockFile?: string;
};

export type JobRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: PhaseName;
  config: Partial<AppConfig> & {
    aiProvider: string;
    voiceProvider: string;
    voiceModel?: string;
    language: string;
  };
  phases: Record<string, PhaseState>;
  artifacts: JobArtifacts;
  hashes: Record<string, string>;
  providerMeta: {
    aiProvider?: string;
    aiModel?: string;
    voiceProvider?: string;
    voiceModel?: string;
  };
  errors: string[];
  warnings: string[];
  render?: {
    durationSeconds?: number;
    fps?: number;
    width?: number;
    height?: number;
    preview?: boolean;
    /**
     * Audio bytes published to Remotion immediately before renderMedia.
     * QC must trust this provenance — not a sidecar created in post_process.
     */
    narrationProvenance?: {
      sourcePath: string;
      kind: 'loudnorm' | 'raw' | 'mock';
      sha1: string;
      publicFile: string;
      recordedAt: string;
    };
  };
  validation?: {
    level?: string;
    ok?: boolean;
  };
  audioIsTest?: boolean;
};

const PHASE_ORDER: PhaseName[] = [
  'generating_script',
  'validating',
  'planning_scenes',
  'generating_voice',
  'generating_subtitles',
  'rendering',
  'post_process',
  'quality_check',
  'completed',
];

export const VOICE_DEPENDENT_PHASES: PhaseName[] = [
  'generating_voice',
  'generating_subtitles',
  'rendering',
  'post_process',
  'quality_check',
  'completed',
];

export const createEmptyJob = (
  id: string,
  title: string,
  config: AppConfig,
): JobRecord => {
  const phases: Record<string, PhaseState> = {};
  for (const p of PHASE_ORDER) {
    phases[p] = {status: 'pending'};
  }
  return {
    id,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'pending',
    config: {
      aiProvider: config.aiProvider,
      voiceProvider: config.voiceProvider,
      language: config.language,
      targetDurationSeconds: config.targetDurationSeconds,
      fps: config.fps,
      width: config.width,
      height: config.height,
      humanReviewPolicy: config.humanReviewPolicy,
    },
    phases,
    artifacts: {},
    hashes: {},
    providerMeta: {},
    errors: [],
    warnings: [],
  };
};

export class JobStore {
  constructor(private readonly outputDir: string) {
    mkdirSync(outputDir, {recursive: true});
  }

  jobDir(id: string): string {
    return path.join(this.outputDir, id);
  }

  metadataPath(id: string): string {
    return path.join(this.jobDir(id), 'metadata.json');
  }

  ensureJobDir(id: string): string {
    const dir = this.jobDir(id);
    mkdirSync(path.join(dir, 'assets'), {recursive: true});
    return dir;
  }

  load(id: string): JobRecord | null {
    const file = this.metadataPath(id);
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, 'utf8')) as JobRecord;
  }

  save(job: JobRecord): void {
    this.ensureJobDir(job.id);
    job.updatedAt = new Date().toISOString();
    const file = this.metadataPath(job.id);
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(job, null, 2));
    renameSync(tmp, file);
    job.artifacts.metadataJson = file;
  }

  writeJson(id: string, filename: string, data: unknown): string {
    const file = path.join(this.ensureJobDir(id), filename);
    writeFileSync(file, JSON.stringify(data, null, 2));
    return file;
  }

  writeText(id: string, filename: string, content: string): string {
    const file = path.join(this.ensureJobDir(id), filename);
    writeFileSync(file, content);
    return file;
  }

  readScript(id: string): VideoScript | null {
    const job = this.load(id);
    const file = job?.artifacts.scriptJson;
    if (!file || !existsSync(file)) {
      const fallback = path.join(this.jobDir(id), 'script.json');
      if (!existsSync(fallback)) return null;
      return JSON.parse(readFileSync(fallback, 'utf8')) as VideoScript;
    }
    return JSON.parse(readFileSync(file, 'utf8')) as VideoScript;
  }

  acquireLock(id: string): boolean {
    const lock = path.join(this.ensureJobDir(id), '.lock');
    try {
      const fd = openSync(lock, 'wx');
      closeSync(fd);
      writeFileSync(lock, String(process.pid));
      return true;
    } catch {
      return false;
    }
  }

  releaseLock(id: string): void {
    const lock = path.join(this.jobDir(id), '.lock');
    if (existsSync(lock)) unlinkSync(lock);
  }

  setPhase(
    job: JobRecord,
    phase: PhaseName,
    patch: Partial<PhaseState>,
  ): void {
    job.phases[phase] = {...job.phases[phase], ...patch};
    if (patch.status === 'running') job.status = phase;
    if (phase === 'completed' && patch.status === 'done') {
      job.status = 'completed';
    }
    if (patch.status === 'failed') {
      job.status = 'failed';
      if (patch.error) job.errors.push(patch.error);
    }
  }

  invalidateFrom(job: JobRecord, fromPhase: PhaseName): void {
    const start = PHASE_ORDER.indexOf(fromPhase);
    for (let i = start; i < PHASE_ORDER.length; i++) {
      const p = PHASE_ORDER[i]!;
      if (p === 'completed') continue;
      job.phases[p] = {status: 'pending'};
    }
  }

  isPhaseDone(job: JobRecord, phase: PhaseName): boolean {
    return job.phases[phase]?.status === 'done';
  }

  hashAndStore(job: JobRecord, key: string, value: unknown): string {
    const h = hashContent(value);
    job.hashes[key] = h;
    return h;
  }
}
