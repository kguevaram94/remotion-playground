/**
 * Offline generating_subtitles for file single-take + legacy meta compatibility.
 * No Remotion / FFmpeg / network.
 */
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  DEFAULT_CHATTERBOX_SCRIPT,
  DEFAULT_CHATTERBOX_TIMEOUT_MS,
  type AppConfig,
} from '../../src/shorts/config/env';
import {runGenerateSubtitles} from '../../src/shorts/pipeline/generate-subtitles';
import {allocateSceneTimings} from '../../src/shorts/utils/timing';
import {
  JobStore,
  createEmptyJob,
  type JobRecord,
} from '../../src/shorts/storage/job-store';

const pilotScript = {
  id: 't007b-file-pilot',
  title: 'Piloto file',
  language: 'es',
  niche: 'logic',
  format: 'logic-puzzle',
  targetDurationSeconds: 9.6,
  aspectRatio: '9:16' as const,
  fps: 30,
  resolution: {width: 1080, height: 1920},
  hook: 'Buenos días',
  narration: 'Buenos días. Vamos a revisar.',
  scenes: [
    {
      id: 'saludo',
      type: 'hook',
      durationSeconds: 4,
      narration: 'Buenos días. ¿Qué tal estás?',
      onScreenText: 'BUENOS DÍAS',
      subtitleText: 'Buenos días',
      transition: 'fade',
      visual: {template: 'text', headline: 'Buenos días', body: 'saludo'},
    },
    {
      id: 'explicacion',
      type: 'reveal',
      durationSeconds: 5.566666666666666,
      narration: 'Vamos a revisar el resultado con calma.',
      onScreenText: 'REVISAR',
      subtitleText: 'Revisar con calma',
      transition: 'fade',
      visual: {template: 'text', headline: 'Revisar', body: 'explicación'},
    },
    {
      id: 'cierre-schema',
      type: 'outro',
      durationSeconds: 0.03333333333333333,
      narration: '',
      onScreenText: 'T-007B',
      subtitleText: '',
      transition: 'none',
      visual: {template: 'text', headline: 'T-007B', body: 'muda'},
    },
  ],
  solution: {
    summary: 'piloto',
    explanation: 'piloto',
    validationStatus: 'partial' as const,
  },
  callToAction: 'no publicar',
  sources: [],
  createdAt: '2026-10-22T10:05:00.000Z',
  schemaVersion: 1,
};

const baseConfig = (over: Partial<AppConfig> = {}): AppConfig => ({
  language: 'es',
  targetDurationSeconds: 25,
  maxDurationSeconds: 45,
  minDurationSeconds: 12,
  fps: 30,
  width: 1080,
  height: 1920,
  outputDir: 'output',
  maxRetries: 2,
  requestTimeoutMs: 30_000,
  previewScale: 0.5,
  humanReviewPolicy: 'warn_and_continue',
  aiProvider: 'template',
  aiModel: 'template-v1',
  voiceProvider: 'file',
  voiceModel: 'file',
  voiceSpeed: 1,
  chatterboxScript: path.resolve(DEFAULT_CHATTERBOX_SCRIPT),
  chatterboxDevice: 'auto',
  chatterboxTimeoutMs: DEFAULT_CHATTERBOX_TIMEOUT_MS,
  chatterboxLanguageId: 'es',
  chatterboxExaggeration: 0.5,
  chatterboxCfgWeight: 0.5,
  chatterboxTemperature: 0.8,
  ...over,
});

describe('generate-subtitles file single-take', () => {
  let dir: string;
  let store: JobStore;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'gs-file-st-'));
    store = new JobStore(dir);
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  const seed = (
    config: AppConfig,
    meta: Record<string, unknown>,
  ): JobRecord => {
    const job = createEmptyJob('sub-st', 'Subtitles single-take', config);
    store.save(job);
    const scriptFile = store.writeJson(job.id, 'script.json', pilotScript);
    job.artifacts.scriptJson = scriptFile;
    writeFileSync(
      path.join(store.jobDir(job.id), 'voice-meta.json'),
      JSON.stringify(meta, null, 2),
      'utf8',
    );
    store.save(job);
    return job;
  };

  it('keeps 9.6s / 288 frames and mute outro; ignores no-segment path stretch', () => {
    const config = baseConfig();
    const job = seed(config, {
      durationSeconds: 9.6,
      provider: 'file',
      model: 'pilot.wav',
      isTestAudio: false,
      format: 'wav',
      timingMode: 'single-take',
      cuesKind: 'uniform',
      cues: [
        {text: 'Buenos', startMs: 0, endMs: 1600},
        {text: 'días', startMs: 1600, endMs: 3200},
        {text: 'Vamos', startMs: 4000, endMs: 5600},
        {text: 'a', startMs: 5600, endMs: 7200},
        {text: 'revisar', startMs: 7200, endMs: 9600},
      ],
    });

    const done = runGenerateSubtitles(store, job, config);
    const script = JSON.parse(
      readFileSync(path.join(store.jobDir(job.id), 'script.json'), 'utf8'),
    ) as typeof pilotScript;

    const sum = script.scenes.reduce((a, s) => a + s.durationSeconds, 0);
    expect(sum).toBeCloseTo(9.6, 10);
    expect(script.scenes[2]!.narration).toBe('');
    expect(script.scenes[2]!.durationSeconds).toBeCloseTo(0.03333333333333333, 10);
    expect(done.render?.durationSeconds).toBeCloseTo(9.6, 10);

    const timed = allocateSceneTimings(script.scenes, 30);
    expect(timed.reduce((a, t) => a + t.durationFrames, 0)).toBe(288);
    expect(done.artifacts.subtitlesSrt).toBeTruthy();
  });

  it('ignores legacy file equal-split segments (4.8+4.8) as scene timings', () => {
    const config = baseConfig();
    const job = seed(config, {
      durationSeconds: 9.6,
      provider: 'file',
      model: 'legacy.wav',
      isTestAudio: false,
      format: 'wav',
      // Legacy shape without timingMode — still treated as single-take
      segments: [
        {
          text: 'saludo',
          sceneId: 'saludo',
          pauseAfterSec: 0,
          durationSeconds: 4.8,
        },
        {
          text: 'explicacion',
          sceneId: 'explicacion',
          pauseAfterSec: 0,
          durationSeconds: 4.8,
        },
      ],
      cues: [{text: 'Hola', startMs: 0, endMs: 9600}],
    });

    runGenerateSubtitles(store, job, config);
    const script = JSON.parse(
      readFileSync(path.join(store.jobDir(job.id), 'script.json'), 'utf8'),
    ) as typeof pilotScript;

    expect(script.scenes[0]!.durationSeconds).toBe(4);
    expect(script.scenes[1]!.durationSeconds).toBeCloseTo(5.566666666666666, 10);
    expect(script.scenes.reduce((a, s) => a + s.durationSeconds, 0)).toBeCloseTo(
      9.6,
      10,
    );
  });

  it('errors when WAV meta duration disagrees with script authorship', () => {
    const config = baseConfig();
    const job = seed(config, {
      durationSeconds: 12,
      provider: 'file',
      timingMode: 'single-take',
      cuesKind: 'uniform',
      cues: [],
      format: 'wav',
      isTestAudio: false,
      model: 'bad.wav',
    });
    expect(() => runGenerateSubtitles(store, job, config)).toThrow(/single-take/);
  });

  it('Chatterbox-style measured segments still remap scene durations', () => {
    const config = baseConfig({voiceProvider: 'chatterbox'});
    const script = {
      ...pilotScript,
      scenes: pilotScript.scenes.map((s) => ({...s, durationSeconds: 2})),
    };
    const job = createEmptyJob('sub-cbx', 'Subtitles cbx', config);
    store.save(job);
    store.writeJson(job.id, 'script.json', script);
    job.artifacts.scriptJson = path.join(store.jobDir(job.id), 'script.json');
    writeFileSync(
      path.join(store.jobDir(job.id), 'voice-meta.json'),
      JSON.stringify({
        durationSeconds: 10.5,
        provider: 'chatterbox',
        model: 'chatterbox-stub',
        isTestAudio: true,
        format: 'wav',
        segments: [
          {sceneId: 'saludo', durationSeconds: 3, pauseAfterSec: 0.7},
          {sceneId: 'explicacion', durationSeconds: 4, pauseAfterSec: 0.7},
          {sceneId: 'cierre-schema', durationSeconds: 1, pauseAfterSec: 0},
        ],
        cues: [],
      }),
      'utf8',
    );
    store.save(job);

    runGenerateSubtitles(store, job, config);
    const out = JSON.parse(
      readFileSync(path.join(store.jobDir(job.id), 'script.json'), 'utf8'),
    ) as typeof pilotScript;

    expect(out.scenes[0]!.durationSeconds).toBeCloseTo(3.7, 5);
    expect(out.scenes[1]!.durationSeconds).toBeCloseTo(4.7, 5);
    expect(out.scenes[2]!.durationSeconds).toBeCloseTo(1, 5);
  });
});
