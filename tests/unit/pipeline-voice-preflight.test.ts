/**
 * H1 — Preflight de configuración de voz (T-CHATTERBOX-002 · fase 2C).
 *
 * Regresión: assertConfigForMode debe activarse según el modo de ejecución
 * y el provider configurado — no solo para openai-tts.
 */
import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  assertConfigForMode,
  DEFAULT_CHATTERBOX_SCRIPT,
  DEFAULT_CHATTERBOX_TIMEOUT_MS,
  type AppConfig,
} from '../../src/shorts/config/env';
import {runPipeline} from '../../src/shorts/pipeline/run';
import {JobStore, createEmptyJob} from '../../src/shorts/storage/job-store';

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

const MINIMAL_SCRIPT = {
  id: 'preflight-job',
  title: 'Preflight',
  narration: 'Hola',
  scenes: [{id: 'hook', narration: 'Hola'}],
};

describe('assertConfigForMode — voice providers (H1)', () => {
  it('passes for complete Chatterbox config when needsVoice', () => {
    expect(() =>
      assertConfigForMode(
        baseConfig({
          voiceProvider: 'chatterbox',
          chatterboxPython: '/venv/bin/python',
          chatterboxCkptDir: '/ckpts',
          chatterboxRefWav: '/ref.wav',
        }),
        false,
        true,
      ),
    ).not.toThrow();
  });

  it('fails explicitly for incomplete Chatterbox (no silent mock)', () => {
    expect(() =>
      assertConfigForMode(
        baseConfig({
          voiceProvider: 'chatterbox',
          chatterboxPython: undefined,
          chatterboxCkptDir: undefined,
          chatterboxRefWav: undefined,
        }),
        false,
        true,
      ),
    ).toThrow(/CHATTERBOX_PYTHON.*CHATTERBOX_CKPT_DIR.*CHATTERBOX_REF_WAV/);
  });

  it('lists only the missing Chatterbox vars', () => {
    expect(() =>
      assertConfigForMode(
        baseConfig({
          voiceProvider: 'chatterbox',
          chatterboxPython: '/venv/bin/python',
          chatterboxCkptDir: undefined,
          chatterboxRefWav: '/ref.wav',
        }),
        false,
        true,
      ),
    ).toThrow(/CHATTERBOX_CKPT_DIR/);
    expect(() =>
      assertConfigForMode(
        baseConfig({
          voiceProvider: 'chatterbox',
          chatterboxPython: '/venv/bin/python',
          chatterboxCkptDir: undefined,
          chatterboxRefWav: '/ref.wav',
        }),
        false,
        true,
      ),
    ).not.toThrow(/CHATTERBOX_PYTHON/);
  });

  it('fails openai-tts without API key when needsVoice', () => {
    expect(() =>
      assertConfigForMode(
        baseConfig({voiceProvider: 'openai-tts', voiceApiKey: undefined}),
        false,
        true,
      ),
    ).toThrow(/OPENAI_API_KEY|openai-tts/);
  });

  it('passes openai-tts with API key', () => {
    expect(() =>
      assertConfigForMode(
        baseConfig({voiceProvider: 'openai-tts', voiceApiKey: 'sk-test'}),
        false,
        true,
      ),
    ).not.toThrow();
  });

  it('fails elevenlabs without API key or voice id', () => {
    expect(() =>
      assertConfigForMode(
        baseConfig({
          voiceProvider: 'elevenlabs',
          elevenLabsApiKey: undefined,
          elevenLabsVoiceId: undefined,
        }),
        false,
        true,
      ),
    ).toThrow(/ELEVENLABS_API_KEY/);
    expect(() =>
      assertConfigForMode(
        baseConfig({
          voiceProvider: 'elevenlabs',
          elevenLabsApiKey: 'ek-test',
          elevenLabsVoiceId: undefined,
        }),
        false,
        true,
      ),
    ).toThrow(/ELEVENLABS_VOICE_ID/);
  });

  it('passes elevenlabs with key + voice id', () => {
    expect(() =>
      assertConfigForMode(
        baseConfig({
          voiceProvider: 'elevenlabs',
          elevenLabsApiKey: 'ek-test',
          elevenLabsVoiceId: 'voice-1',
        }),
        false,
        true,
      ),
    ).not.toThrow();
  });

  it('passes file / macos-say / mock without secrets (no silent mock swap)', () => {
    for (const voiceProvider of ['file', 'macos-say', 'mock'] as const) {
      expect(() =>
        assertConfigForMode(
          baseConfig({voiceProvider, voiceFile: undefined}),
          false,
          true,
        ),
      ).not.toThrow();
    }
  });

  it('does not validate voice when needsVoice=false (script/validate/post modes)', () => {
    expect(() =>
      assertConfigForMode(
        baseConfig({
          voiceProvider: 'chatterbox',
          chatterboxPython: undefined,
          chatterboxCkptDir: undefined,
          chatterboxRefWav: undefined,
        }),
        false,
        false,
      ),
    ).not.toThrow();
    expect(() =>
      assertConfigForMode(
        baseConfig({voiceProvider: 'openai-tts', voiceApiKey: undefined}),
        false,
        false,
      ),
    ).not.toThrow();
  });
});

describe('runPipeline voice preflight wiring (H1)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'preflight-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  const seedJob = (config: AppConfig) => {
    const store = new JobStore(config.outputDir);
    const job = createEmptyJob('preflight-job', 'Preflight', config);
    store.save(job);
    store.writeJson(job.id, 'script.json', MINIMAL_SCRIPT);
    job.artifacts.scriptJson = path.join(
      store.jobDir(job.id),
      'script.json',
    );
    store.save(job);
    return store;
  };

  it('rejects incomplete Chatterbox early in mode=voice (never degrades to mock)', async () => {
    const config = baseConfig({
      outputDir: dir,
      voiceProvider: 'chatterbox',
      // missing python / ckpt / ref
    });
    seedJob(config);

    await expect(
      runPipeline({id: 'preflight-job', mode: 'voice', config}),
    ).rejects.toThrow(/VOICE_PROVIDER=chatterbox requiere/);

    const store = new JobStore(dir);
    const job = store.load('preflight-job')!;
    // Failed before generate-voice: phase still pending (not done with mock).
    expect(job.phases.generating_voice?.status).not.toBe('done');
    expect(job.providerMeta.voiceProvider).not.toBe('mock');
    expect(job.audioIsTest).toBeFalsy();
  });

  it('allows mode=script with incomplete Chatterbox (voice not required)', async () => {
    const config = baseConfig({
      outputDir: dir,
      voiceProvider: 'chatterbox',
      aiProvider: 'template',
    });
    const job = await runPipeline({
      title: 'Script sin voz',
      id: 'script-only',
      mode: 'script',
      config,
    });
    expect(job.artifacts.scriptJson).toBeTruthy();
  });

  it('mode=render with incomplete Chatterbox fails at preflight (not later mock)', async () => {
    const config = baseConfig({
      outputDir: dir,
      voiceProvider: 'chatterbox',
    });
    seedJob(config);

    await expect(
      runPipeline({id: 'preflight-job', mode: 'render', config}),
    ).rejects.toThrow(/VOICE_PROVIDER=chatterbox requiere/);
  });
});
