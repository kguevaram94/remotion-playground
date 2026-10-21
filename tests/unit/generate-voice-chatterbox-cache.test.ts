/**
 * Wiring tests for Chatterbox cache identity inside runGenerateVoice
 * (T-CHATTERBOX-002 · phase 2B audit #9).
 *
 * Exercises the real pipeline module with deterministic fixtures.
 * Chatterbox synthesize is stubbed — no downloads / inference.
 */
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  DEFAULT_CHATTERBOX_SCRIPT,
  DEFAULT_CHATTERBOX_TIMEOUT_MS,
  type AppConfig,
} from '../../src/shorts/config/env';
import {runGenerateVoice} from '../../src/shorts/pipeline/generate-voice';
import {
  JobStore,
  createEmptyJob,
  type JobRecord,
} from '../../src/shorts/storage/job-store';
import {
  buildChatterboxCacheModelIdentity,
  resolveChatterboxPinFilePath,
} from '../../src/shorts/voice/chatterbox-cache';
import {
  buildNarrationSegments,
  joinNarrationPlain,
} from '../../src/shorts/voice/narration-segments';

const synthesizeCalls: Array<{text: string; outputPath: string}> = [];

vi.mock('../../src/shorts/voice/provider', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/shorts/voice/provider')>();
  return {
    ...actual,
    createVoiceProvider: vi.fn((config: AppConfig) => {
      if (config.voiceProvider !== 'chatterbox') {
        return actual.createVoiceProvider(config);
      }
      return {
        name: 'chatterbox',
        async synthesize(text: string, outputPath: string) {
          synthesizeCalls.push({text, outputPath});
          const {durationSeconds, sampleRate} = actual.writeTestWav(
            outputPath,
            0.4,
          );
          return {
            audioPath: outputPath,
            durationSeconds,
            sampleRate,
            format: 'wav',
            provider: 'chatterbox',
            model: 'chatterbox-stub',
            isTestAudio: true,
          };
        },
      };
    }),
  };
});

import {
  createVoiceProvider,
  narrationCacheKey,
  writeTestWav,
} from '../../src/shorts/voice/provider';

const PIN_FIXTURE = `# Python interpreter: 3.11.17
torch==2.6.0
torchaudio==2.6.0
chatterbox-tts==0.1.7
`;

const SCRIPT_SCENES = [
  {id: 'hook', narration: 'Hola cableado de caché Chatterbox'},
];

const minimalScript = () => ({
  id: 'cb-cache-wire',
  title: 'Wire test',
  narration: SCRIPT_SCENES.map((s) => s.narration).join(' '),
  scenes: SCRIPT_SCENES,
});

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
  voiceProvider: 'mock',
  voiceModel: 'mock-tone',
  voiceSpeed: 1.2,
  chatterboxScript: path.resolve(DEFAULT_CHATTERBOX_SCRIPT),
  chatterboxDevice: 'auto',
  chatterboxTimeoutMs: DEFAULT_CHATTERBOX_TIMEOUT_MS,
  chatterboxLanguageId: 'es',
  chatterboxExaggeration: 0.5,
  chatterboxCfgWeight: 0.5,
  chatterboxTemperature: 0.8,
  ...over,
});

const expectedCacheKey = async (config: AppConfig): Promise<string> => {
  const segments = buildNarrationSegments(SCRIPT_SCENES);
  const text = joinNarrationPlain(SCRIPT_SCENES);
  let modelIdentity: string;
  if (config.voiceProvider === 'chatterbox') {
    modelIdentity = await buildChatterboxCacheModelIdentity({
      refWavPath: config.chatterboxRefWav!,
      pinFilePath: resolveChatterboxPinFilePath(config.chatterboxScript),
      device: config.chatterboxDevice,
      languageId: config.chatterboxLanguageId,
      exaggeration: config.chatterboxExaggeration,
      cfgWeight: config.chatterboxCfgWeight,
      temperature: config.chatterboxTemperature,
    });
  } else {
    modelIdentity = [
      config.voiceModel,
      config.voiceName,
      config.voiceTtsModel,
      `speed:${config.voiceSpeed}`,
      config.voiceInstructions?.slice(0, 200),
      config.elevenLabsVoiceId,
      config.voiceFile,
    ]
      .filter(Boolean)
      .join('|');
  }
  return narrationCacheKey(
    `${text}|pauses:${segments.map((s) => s.pauseAfterSec).join(',')}`,
    config.voiceProvider,
    modelIdentity,
  );
};

describe('generate-voice Chatterbox cache wiring (phase 2B · audit #9)', () => {
  let dir: string;
  let cliDir: string;
  let pinPath: string;
  let refPath: string;
  let scriptPath: string;
  let store: JobStore;

  beforeEach(() => {
    synthesizeCalls.length = 0;
    vi.mocked(createVoiceProvider).mockClear();
    dir = mkdtempSync(path.join(tmpdir(), 'gv-cbx-'));
    cliDir = path.join(dir, 'tools', 'chatterbox');
    mkdirSync(cliDir, {recursive: true});
    pinPath = path.join(cliDir, 'requirements-pin.txt');
    writeFileSync(pinPath, PIN_FIXTURE, 'utf8');
    scriptPath = path.join(cliDir, 'synthesize.py');
    writeFileSync(scriptPath, '# stub cli\n', 'utf8');
    refPath = path.join(dir, 'ref.wav');
    writeFileSync(refPath, Buffer.from('synthetic-ref-bytes-wire'));
    store = new JobStore(dir);
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  const seedJob = (config: AppConfig): JobRecord => {
    const job = createEmptyJob('wire-job', 'Wire test', config);
    store.save(job);
    const scriptFile = store.writeJson(job.id, 'script.json', minimalScript());
    job.artifacts.scriptJson = scriptFile;
    store.save(job);
    return job;
  };

  const chatterboxConfig = (
    over: Partial<AppConfig> = {},
  ): AppConfig =>
    baseConfig({
      voiceProvider: 'chatterbox',
      voiceModel: 'chatterbox',
      chatterboxScript: scriptPath,
      chatterboxRefWav: refPath,
      chatterboxPython: '/opt/venv/bin/python',
      chatterboxCkptDir: '/opt/ckpts',
      ...over,
    });

  it('computes Chatterbox identity before cache reuse and includes ref+pins in the key', async () => {
    const config = chatterboxConfig();
    const job = seedJob(config);
    const key = await expectedCacheKey(config);
    const audioPath = path.join(store.jobDir(job.id), 'narration.wav');
    writeTestWav(audioPath, 0.3);
    job.artifacts.narrationAudio = audioPath;
    job.hashes.narrationText = key;
    job.audioIsTest = true;
    store.save(job);

    const reused = await runGenerateVoice(store, job, config);
    expect(reused.warnings.some((w) => /Reutilizando narración/.test(w))).toBe(
      true,
    );
    expect(synthesizeCalls).toHaveLength(0);
    expect(createVoiceProvider).not.toHaveBeenCalled();

    // Pin change must invalidate the pipeline cache key (forces synthesize stub).
    writeFileSync(
      pinPath,
      PIN_FIXTURE.replace('chatterbox-tts==0.1.7', 'chatterbox-tts==0.1.8'),
      'utf8',
    );
    synthesizeCalls.length = 0;
    const afterPins = await runGenerateVoice(store, job, config);
    expect(synthesizeCalls.length).toBeGreaterThan(0);
    expect(createVoiceProvider).toHaveBeenCalled();
    expect(afterPins.hashes.narrationText).not.toBe(key);
    expect(afterPins.hashes.narrationText).toBe(await expectedCacheKey(config));

    // Ref byte change also changes the key used by the flow.
    const keyWithPins = afterPins.hashes.narrationText!;
    writeFileSync(refPath, Buffer.from('synthetic-ref-bytes-wire-CHANGED'));
    synthesizeCalls.length = 0;
    const afterRef = await runGenerateVoice(store, job, config);
    expect(synthesizeCalls.length).toBeGreaterThan(0);
    expect(afterRef.hashes.narrationText).not.toBe(keyWithPins);
  });

  it('does not silently reuse cache when Chatterbox identity calculation fails', async () => {
    const config = chatterboxConfig({
      chatterboxRefWav: path.join(dir, 'missing-ref.wav'),
    });
    const job = seedJob(config);
    const audioPath = path.join(store.jobDir(job.id), 'narration.wav');
    writeTestWav(audioPath, 0.3);
    job.artifacts.narrationAudio = audioPath;
    // Stale hash that would match a reuse check if identity were skipped.
    job.hashes.narrationText = 'stale-cache-key-that-must-not-be-trusted';
    job.audioIsTest = true;
    store.save(job);

    await expect(runGenerateVoice(store, job, config)).rejects.toThrow(
      /no se puede leer la referencia vocal/,
    );
    const failed = store.load(job.id)!;
    expect(failed.phases.generating_voice?.status).toBe('failed');
    expect(
      failed.warnings.some((w) => /Reutilizando narración/.test(w)),
    ).toBe(false);
    expect(synthesizeCalls).toHaveLength(0);
    expect(existsSync(audioPath)).toBe(true); // artifact left untouched
  });

  it('keeps non-Chatterbox providers on the legacy cache identity path', async () => {
    const config = baseConfig({voiceProvider: 'mock', voiceModel: 'mock-tone'});
    const job = seedJob(config);
    const first = await runGenerateVoice(store, job, config);
    expect(first.hashes.narrationText).toBe(await expectedCacheKey(config));
    expect(first.artifacts.narrationAudio).toBeTruthy();
    expect(existsSync(first.artifacts.narrationAudio!)).toBe(true);

    const warningsBefore = first.warnings.length;
    const second = await runGenerateVoice(store, first, config);
    expect(second.warnings.length).toBeGreaterThan(warningsBefore);
    expect(second.warnings.some((w) => /Reutilizando narración/.test(w))).toBe(
      true,
    );
    // Legacy identity must not include 2b/refSha256 markers.
    expect(await expectedCacheKey(config)).not.toMatch(/refSha256=/);
  });
});
