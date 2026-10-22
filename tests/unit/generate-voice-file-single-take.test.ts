/**
 * Offline VOICE_PROVIDER=file single-take contract (T-CHATTERBOX-007C-SYNC · A).
 * Synthetic PCM WAV only — no Remotion, FFmpeg loudnorm, network, or inference.
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
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
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
import {FILE_SINGLE_TAKE_CACHE_TOKEN} from '../../src/shorts/voice/single-take';
import {narrationCacheKey} from '../../src/shorts/voice/provider';
import {
  buildNarrationSegments,
  joinNarrationPlain,
} from '../../src/shorts/voice/narration-segments';

vi.mock('../../src/shorts/media/narration-loudnorm', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../src/shorts/media/narration-loudnorm')
    >();
  return {
    ...actual,
    ensureNarrationLoudnorm: vi.fn(
      (opts: {narrationAudio: string; isTestAudio: boolean}) => ({
        usedPath: opts.narrationAudio,
        loudnormPath: null,
        applied: false,
      }),
    ),
  };
});

const writePcm16MonoWav = (
  filePath: string,
  options: {sampleRate: number; durationSeconds: number},
): void => {
  const {sampleRate, durationSeconds} = options;
  const numSamples = Math.round(durationSeconds * sampleRate);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, buf);
};

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
  narration:
    'Buenos días. ¿Qué tal estás? Espero que hayas empezado bien la mañana. Vamos a revisar el resultado con calma. Tenemos todo preparado y podemos avanzar paso a paso.',
  scenes: [
    {
      id: 'saludo',
      type: 'hook',
      durationSeconds: 4,
      narration:
        'Buenos días. ¿Qué tal estás? Espero que hayas empezado bien la mañana.',
      onScreenText: 'BUENOS DÍAS',
      subtitleText: 'Buenos días',
      transition: 'fade',
      visual: {template: 'text', headline: 'Buenos días', body: 'saludo'},
    },
    {
      id: 'explicacion',
      type: 'reveal',
      durationSeconds: 5.566666666666666,
      narration:
        'Vamos a revisar el resultado con calma. Tenemos todo preparado y podemos avanzar paso a paso.',
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

describe('generate-voice file single-take', () => {
  let dir: string;
  let store: JobStore;
  let wavPath: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'gv-file-st-'));
    store = new JobStore(dir);
    wavPath = path.join(dir, 'pilot-9_6.wav');
    writePcm16MonoWav(wavPath, {sampleRate: 24000, durationSeconds: 9.6});
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  const seed = (config: AppConfig, script = pilotScript): JobRecord => {
    const job = createEmptyJob('file-st', 'File single-take', config);
    store.save(job);
    const scriptFile = store.writeJson(job.id, 'script.json', script);
    job.artifacts.scriptJson = scriptFile;
    store.save(job);
    return job;
  };

  it('writes single-take meta without equal-split 4.8+4.8 segments', async () => {
    const config = baseConfig({voiceFile: wavPath});
    const job = seed(config);
    const done = await runGenerateVoice(store, job, config);

    const meta = JSON.parse(
      readFileSync(path.join(store.jobDir(job.id), 'voice-meta.json'), 'utf8'),
    ) as {
      durationSeconds: number;
      timingMode?: string;
      cuesKind?: string;
      segments?: Array<{durationSeconds: number; sceneId: string}>;
      cues?: Array<{text: string; startMs: number; endMs: number}>;
    };

    expect(done.render?.durationSeconds).toBeCloseTo(9.6, 5);
    expect(meta.durationSeconds).toBeCloseTo(9.6, 5);
    expect(meta.timingMode).toBe('single-take');
    expect(meta.cuesKind).toBe('uniform');
    expect(meta.segments).toBeUndefined();
    expect(meta.cues?.length).toBeGreaterThan(0);

    // Uniform cues: equal slices — approximate, not phonetic.
    const cues = meta.cues!;
    const widths = cues.map((c) => c.endMs - c.startMs);
    const first = widths[0]!;
    expect(widths.every((w) => Math.abs(w - first) < 1e-6)).toBe(true);
  });

  it('rejects when script sum disagrees with WAV beyond tolerance', async () => {
    const config = baseConfig({voiceFile: wavPath});
    const bad = {
      ...pilotScript,
      scenes: pilotScript.scenes.map((s, i) =>
        i === 0 ? {...s, durationSeconds: 8} : s,
      ),
    };
    const job = seed(config, bad);
    await expect(runGenerateVoice(store, job, config)).rejects.toThrow(
      /single-take/,
    );
  });

  it('uses file:single-take-v1 in the narration cache identity', async () => {
    const config = baseConfig({voiceFile: wavPath});
    const job = seed(config);
    await runGenerateVoice(store, job, config);

    const segments = buildNarrationSegments(pilotScript.scenes);
    const text = joinNarrationPlain(pilotScript.scenes);
    const expected = narrationCacheKey(
      `${text}|pauses:${segments.map((s) => s.pauseAfterSec).join(',')}`,
      'file',
      FILE_SINGLE_TAKE_CACHE_TOKEN + '|' + wavPath,
    );
    expect(job.hashes.narrationText).toBe(expected);
  });
});
