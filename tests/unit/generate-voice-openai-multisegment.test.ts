/**
 * Regression: OpenAI TTS multi-segment path still writes measured per-scene
 * segments (not file single-take meta). Offline stub — no network.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  DEFAULT_CHATTERBOX_SCRIPT,
  DEFAULT_CHATTERBOX_TIMEOUT_MS,
  type AppConfig,
} from '../../src/shorts/config/env';
import {
  JobStore,
  createEmptyJob,
} from '../../src/shorts/storage/job-store';

const synthesizeCalls: string[] = [];

vi.mock('../../src/shorts/voice/provider', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/shorts/voice/provider')>();
  return {
    ...actual,
    createVoiceProvider: vi.fn((config: AppConfig) => {
      if (config.voiceProvider !== 'openai-tts') {
        return actual.createVoiceProvider(config);
      }
      return {
        name: 'openai-tts',
        async synthesize(text: string, outputPath: string) {
          synthesizeCalls.push(text);
          const {durationSeconds, sampleRate} = actual.writeTestWav(
            outputPath,
            0.4 + synthesizeCalls.length * 0.1,
          );
          return {
            audioPath: outputPath,
            durationSeconds,
            sampleRate,
            format: 'wav',
            provider: 'openai-tts',
            model: 'gpt-4o-mini-tts',
            isTestAudio: true,
          };
        },
      };
    }),
  };
});

vi.mock('../../src/shorts/media/narration-loudnorm', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../src/shorts/media/narration-loudnorm')
    >();
  return {
    ...actual,
    ensureNarrationLoudnorm: vi.fn(
      (opts: {narrationAudio: string}) => ({
        usedPath: opts.narrationAudio,
        loudnormPath: null,
        applied: false,
      }),
    ),
  };
});

import {runGenerateVoice} from '../../src/shorts/pipeline/generate-voice';

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
  voiceProvider: 'openai-tts',
  voiceModel: 'gpt-4o-mini-tts',
  voiceApiKey: 'sk-test',
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

describe('generate-voice OpenAI multi-segment regression', () => {
  let dir: string;
  let store: JobStore;

  beforeEach(() => {
    synthesizeCalls.length = 0;
    dir = mkdtempSync(path.join(tmpdir(), 'gv-oai-ms-'));
    store = new JobStore(dir);
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('writes measured segments without timingMode single-take', async () => {
    const config = baseConfig();
    const job = createEmptyJob('oai-ms', 'OpenAI multi', config);
    store.save(job);
    store.writeJson(job.id, 'script.json', {
      id: 'oai-ms',
      scenes: [
        {id: 'hook', narration: 'Primera frase hablada.'},
        {id: 'reveal', narration: 'Segunda frase hablada.'},
      ],
    });
    job.artifacts.scriptJson = path.join(store.jobDir(job.id), 'script.json');
    store.save(job);

    await runGenerateVoice(store, job, config);

    const meta = JSON.parse(
      readFileSync(path.join(store.jobDir(job.id), 'voice-meta.json'), 'utf8'),
    ) as {
      timingMode?: string;
      cuesKind?: string;
      segments: Array<{
        sceneId: string;
        durationSeconds: number;
        pauseAfterSec: number;
      }>;
    };

    expect(synthesizeCalls).toHaveLength(2);
    expect(meta.timingMode).toBeUndefined();
    expect(meta.cuesKind).toBeUndefined();
    expect(meta.segments).toHaveLength(2);
    expect(meta.segments.map((s) => s.sceneId)).toEqual(['hook', 'reveal']);
    expect(meta.segments[0]!.durationSeconds).toBeCloseTo(0.5, 5);
    expect(meta.segments[1]!.durationSeconds).toBeCloseTo(0.6, 5);
    expect(meta.segments[0]!.pauseAfterSec).toBeGreaterThan(0);
  });
});
