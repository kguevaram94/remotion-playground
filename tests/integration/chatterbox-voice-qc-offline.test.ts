/**
 * H2 — Integración offline Chatterbox → loudnorm → QC (T-CHATTERBOX-002 · fase 2C).
 *
 * Ejercita `runGenerateVoice` + helpers reales de loudnorm/QC con:
 * - provider Chatterbox simulado (PCM16 mono 24 kHz)
 * - loudnorm controlado por stub (sin FFmpeg real obligatorio)
 * - sin inferencia, sin descargas, sin render MP4 real
 *
 * `verified_provenance` aquí = procedencia de loudnorm P5 (bytes publicados),
 * NO procedencia de modelo / checkpoints / ref vocal.
 */
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  copyFileSync,
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
import {
  CHATTERBOX_TARGET_SAMPLE_RATE,
} from '../../src/shorts/voice/chatterbox';
import {runGenerateVoice} from '../../src/shorts/pipeline/generate-voice';
import {
  computePublishEligibility,
  runQualityCheck,
  type QualityReport,
} from '../../src/shorts/pipeline/quality-check';
import {
  JobStore,
  createEmptyJob,
  type JobRecord,
} from '../../src/shorts/storage/job-store';
import {sha1File} from '../../src/shorts/media/narration-loudnorm';
import {PAUSE_PARAGRAPH_SEC} from '../../src/shorts/media/wav-concat';

type SynthCall = {text: string; outputPath: string};

const synthesizeCalls: SynthCall[] = [];
let failOnSegmentIndex: number | null = null;
let loudnormStubCalls = 0;

/** PCM16 mono 24 kHz — contrato Chatterbox. */
const writePcm16Mono24k = (
  filePath: string,
  durationSeconds = 0.25,
): {durationSeconds: number; sampleRate: number} => {
  const sampleRate = CHATTERBOX_TARGET_SAMPLE_RATE;
  const numSamples = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(Math.floor(Math.sin(i / 20) * 2000), 44 + i * 2);
  }
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, buffer);
  return {durationSeconds: numSamples / sampleRate, sampleRate};
};

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
          const idx = synthesizeCalls.length;
          synthesizeCalls.push({text, outputPath});
          if (failOnSegmentIndex !== null && idx === failOnSegmentIndex) {
            throw new Error(
              `Chatterbox stub: fallo simulado en segmento ${idx}`,
            );
          }
          const {durationSeconds, sampleRate} = writePcm16Mono24k(
            outputPath,
            0.3,
          );
          return {
            audioPath: outputPath,
            durationSeconds,
            sampleRate,
            format: 'wav',
            provider: 'chatterbox',
            model: 'chatterbox-offline-stub',
            isTestAudio: false,
          };
        },
      };
    }),
  };
});

vi.mock('../../src/shorts/media/ffmpeg', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/shorts/media/ffmpeg')>();
  return {
    ...actual,
    /** Controlled loudnorm: copy input → output (fixture path; no real FFmpeg). */
    loudnormAudio: vi.fn((inputWav: string, outputWav: string): boolean => {
      loudnormStubCalls += 1;
      if (!existsSync(inputWav)) return false;
      copyFileSync(inputWav, outputWav);
      return existsSync(outputWav);
    }),
  };
});

import {createVoiceProvider} from '../../src/shorts/voice/provider';
import {loudnormAudio} from '../../src/shorts/media/ffmpeg';

const PIN_FIXTURE = `# Python interpreter: 3.11.17
torch==2.6.0
torchaudio==2.6.0
chatterbox-tts==0.1.7
`;

const MULTI_SCENES = [
  {id: 'hook', narration: 'Segmento uno del reto'},
  {id: 'instruction', narration: 'Segmento dos con reglas'},
  {id: 'reveal', narration: 'Segmento tres revelación'},
];

const multiScript = () => ({
  id: 'cb-offline',
  title: 'Chatterbox offline QC',
  narration: MULTI_SCENES.map((s) => s.narration).join(' '),
  scenes: MULTI_SCENES,
});

const qcScript = {
  id: 'cb-offline',
  title: 'Chatterbox offline QC',
  language: 'es',
  targetDurationSeconds: 30,
  hook: 'Hook',
  scenes: [
    {
      id: 's1',
      type: 'hook',
      narration: 'Hola',
      onScreenText: 'Hola',
      subtitleText: 'Hola',
      durationHintSeconds: 3,
      visual: {kind: 'text', text: 'Hola'},
    },
  ],
  solution: {
    summary: 'Resumen',
    explanation: 'Explicación',
    validationStatus: 'partial' as const,
  },
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

describe('Chatterbox → loudnorm → QC offline (H2 · sin inferencia)', () => {
  let dir: string;
  let cliDir: string;
  let scriptPath: string;
  let refPath: string;
  let store: JobStore;

  beforeEach(() => {
    synthesizeCalls.length = 0;
    failOnSegmentIndex = null;
    loudnormStubCalls = 0;
    vi.mocked(createVoiceProvider).mockClear();
    vi.mocked(loudnormAudio).mockClear();

    dir = mkdtempSync(path.join(tmpdir(), 'cb-h2-'));
    cliDir = path.join(dir, 'tools', 'chatterbox');
    mkdirSync(cliDir, {recursive: true});
    writeFileSync(path.join(cliDir, 'requirements-pin.txt'), PIN_FIXTURE);
    scriptPath = path.join(cliDir, 'synthesize.py');
    writeFileSync(scriptPath, '# stub cli\n');
    refPath = path.join(dir, 'ref.wav');
    writeFileSync(refPath, Buffer.from('synthetic-ref-h2'));
    store = new JobStore(dir);
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  const chatterboxConfig = (over: Partial<AppConfig> = {}): AppConfig =>
    baseConfig({
      outputDir: dir,
      voiceProvider: 'chatterbox',
      voiceModel: 'chatterbox',
      chatterboxScript: scriptPath,
      chatterboxRefWav: refPath,
      chatterboxPython: '/opt/venv/bin/python',
      chatterboxCkptDir: '/opt/ckpts',
      ...over,
    });

  const seedJob = (
    config: AppConfig,
    script: ReturnType<typeof multiScript> = multiScript(),
  ): JobRecord => {
    const job = createEmptyJob(script.id, script.title, config);
    store.save(job);
    const scriptFile = store.writeJson(job.id, 'script.json', script);
    job.artifacts.scriptJson = scriptFile;
    store.save(job);
    return job;
  };

  const attachSimulatedRenderProvenance = (job: JobRecord): void => {
    // Render MP4 is simulated: only provenance + placeholder bytes for QC.
    const jobDir = store.jobDir(job.id);
    const videoPath = path.join(jobDir, 'video.mp4');
    writeFileSync(videoPath, Buffer.alloc(12_000, 2));
    job.artifacts.videoMp4 = videoPath;

    const ln = job.artifacts.narrationLoudnorm!;
    const provenance = {
      sourcePath: ln,
      kind: 'loudnorm' as const,
      sha1: sha1File(ln),
      publicFile: `shorts/${job.id}/narration.wav`,
      recordedAt: new Date().toISOString(),
    };
    job.render = {
      ...job.render,
      durationSeconds: job.render?.durationSeconds ?? 3,
      width: 1080,
      height: 1920,
      narrationProvenance: provenance,
    };
    writeFileSync(
      path.join(jobDir, 'render-narration.json'),
      JSON.stringify(provenance, null, 2),
    );
    // QC also needs a script artifact in job dir
    writeFileSync(
      path.join(jobDir, 'script.json'),
      JSON.stringify(qcScript, null, 2),
    );
    job.artifacts.scriptJson = path.join(jobDir, 'script.json');
    store.save(job);
  };

  it('generates multi-segment WAV (24 kHz) with silences, loudnorm stub, and artifacts', async () => {
    const config = chatterboxConfig();
    const job = seedJob(config);

    const done = await runGenerateVoice(store, job, config);

    expect(done.phases.generating_voice?.status).toBe('done');
    expect(done.providerMeta.voiceProvider).toBe('chatterbox');
    expect(done.audioIsTest).toBe(false);
    expect(done.hashes.narrationText).toBeTruthy();
    expect(synthesizeCalls).toHaveLength(MULTI_SCENES.length);
    expect(createVoiceProvider).toHaveBeenCalled();

    const narration = done.artifacts.narrationAudio!;
    expect(existsSync(narration)).toBe(true);
    const wav = readFileSync(narration);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.readUInt32LE(24)).toBe(CHATTERBOX_TARGET_SAMPLE_RATE);
    expect(wav.readUInt16LE(22)).toBe(1); // mono
    expect(wav.readUInt16LE(34)).toBe(16); // PCM16

    // Silences between segments (PAUSE_PARAGRAPH_SEC) → voice-parts + voice-meta
    const meta = JSON.parse(
      readFileSync(path.join(store.jobDir(job.id), 'voice-meta.json'), 'utf8'),
    ) as {
      provider: string;
      isTestAudio: boolean;
      segments: Array<{pauseAfterSec: number; sceneId: string}>;
    };
    expect(meta.provider).toBe('chatterbox');
    expect(meta.isTestAudio).toBe(false);
    expect(meta.segments).toHaveLength(MULTI_SCENES.length);
    expect(meta.segments[0]!.pauseAfterSec).toBe(PAUSE_PARAGRAPH_SEC);
    expect(meta.segments[2]!.pauseAfterSec).toBe(0);
    expect(
      existsSync(
        path.join(store.jobDir(job.id), 'voice-parts', 'silence-000.wav'),
      ),
    ).toBe(true);

    // Real ensureNarrationLoudnorm path with stubbed loudnormAudio
    expect(loudnormStubCalls).toBeGreaterThan(0);
    expect(done.artifacts.narrationLoudnorm).toBeTruthy();
    expect(existsSync(done.artifacts.narrationLoudnorm!)).toBe(true);
  });

  it('marks phase failed mid-segment without success hash or mock fallback', async () => {
    failOnSegmentIndex = 1;
    const config = chatterboxConfig();
    const job = seedJob(config);

    await expect(runGenerateVoice(store, job, config)).rejects.toThrow(
      /fallo simulado en segmento 1/,
    );

    const failed = store.load(job.id)!;
    expect(failed.phases.generating_voice?.status).toBe('failed');
    expect(failed.hashes.narrationText).toBeUndefined();
    expect(failed.providerMeta.voiceProvider).not.toBe('mock');
    expect(failed.audioIsTest).toBeFalsy();
    expect(failed.artifacts.narrationLoudnorm).toBeUndefined();
    // First segment may exist as a partial part; final narration success path not committed
    expect(synthesizeCalls).toHaveLength(2); // 0 ok, 1 throws
  });

  it('reuses cache on retry and does not re-synthesize', async () => {
    const config = chatterboxConfig();
    const job = seedJob(config);

    const first = await runGenerateVoice(store, job, config);
    expect(synthesizeCalls.length).toBe(MULTI_SCENES.length);
    const hash = first.hashes.narrationText!;
    const callsAfterFirst = synthesizeCalls.length;
    const loudnormAfterFirst = loudnormStubCalls;

    const second = await runGenerateVoice(store, first, config);
    expect(second.hashes.narrationText).toBe(hash);
    expect(synthesizeCalls.length).toBe(callsAfterFirst);
    expect(second.warnings.some((w) => /Reutilizando narración/.test(w))).toBe(
      true,
    );
    // Cache path still reapplies loudnorm artifact helper
    expect(loudnormStubCalls).toBeGreaterThanOrEqual(loudnormAfterFirst);
  });

  it('propagates loudnorm provenance into QC + publishEligibility (semantics intact)', async () => {
    const config = chatterboxConfig();
    const job = seedJob(config);
    const voiced = await runGenerateVoice(store, job, config);
    attachSimulatedRenderProvenance(voiced);

    const done = runQualityCheck(store, voiced, config);
    expect(done.phases.quality_check?.status).toBe('done');

    const report = JSON.parse(
      readFileSync(path.join(store.jobDir(job.id), 'report.json'), 'utf8'),
    ) as QualityReport;

    expect(report.ok).toBe(true);
    expect(report.checks.narrationLoudnorm?.ok).toBe(true);
    // P5 loudnorm provenance — NOT model/checkpoint/ref identity
    expect(report.checks.narrationLoudnorm?.detail).toMatch(
      /verified_provenance|loudnorm/i,
    );
    expect(report.publishEligibility.eligible).toBe(true);
    expect(report.publishEligibility.reasons).toEqual([]);

    // Unit gate unchanged
    expect(
      computePublishEligibility({
        technicalOk: true,
        audioIsTest: false,
        loudnormStatus: 'verified_provenance',
      }),
    ).toEqual({eligible: true, reasons: []});
    expect(
      computePublishEligibility({
        technicalOk: true,
        audioIsTest: true,
        loudnormStatus: 'mock_omitted',
      }).eligible,
    ).toBe(false);
  });

  it('rejects publishEligibility when loudnorm provenance is missing (no silent pass)', async () => {
    const config = chatterboxConfig();
    const job = seedJob(config);
    const voiced = await runGenerateVoice(store, job, config);

    const jobDir = store.jobDir(voiced.id);
    writeFileSync(path.join(jobDir, 'video.mp4'), Buffer.alloc(4_000, 1));
    voiced.artifacts.videoMp4 = path.join(jobDir, 'video.mp4');
    writeFileSync(
      path.join(jobDir, 'script.json'),
      JSON.stringify(qcScript, null, 2),
    );
    voiced.artifacts.scriptJson = path.join(jobDir, 'script.json');
    voiced.render = {
      durationSeconds: 3,
      width: 1080,
      height: 1920,
      // no narrationProvenance — simulated incomplete render
    };
    store.save(voiced);

    expect(() => runQualityCheck(store, voiced, config)).toThrow(/loudnorm/i);

    const report = JSON.parse(
      readFileSync(path.join(jobDir, 'report.json'), 'utf8'),
    ) as QualityReport;
    expect(report.ok).toBe(false);
    expect(report.publishEligibility.eligible).toBe(false);
    expect(report.publishEligibility.reasons).toEqual(
      expect.arrayContaining([
        'technical_qc_failed',
        expect.stringMatching(/narration_loudnorm/),
      ]),
    );
  });
});
