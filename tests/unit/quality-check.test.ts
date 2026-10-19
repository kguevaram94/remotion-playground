import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadConfig} from '../../src/shorts/config/env';
import {sha1File} from '../../src/shorts/media/narration-loudnorm';
import {
  applyNarrationLoudnormGate,
  computePublishEligibility,
  runQualityCheck,
  type QualityReport,
} from '../../src/shorts/pipeline/quality-check';
import {JobStore, createEmptyJob} from '../../src/shorts/storage/job-store';

const minimalScript = {
  id: 'qc-demo',
  title: 'QC Demo',
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

describe('computePublishEligibility', () => {
  it('never marks mock audio as eligible', () => {
    const result = computePublishEligibility({
      technicalOk: true,
      audioIsTest: true,
      loudnormStatus: 'mock_omitted',
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('audio_mock');
    expect(result.reasons).toContain('mock_omitted');
  });

  it('marks real voice eligible only with verified loudnorm and technical ok', () => {
    expect(
      computePublishEligibility({
        technicalOk: true,
        audioIsTest: false,
        loudnormStatus: 'verified_provenance',
      }),
    ).toEqual({eligible: true, reasons: []});
  });

  it('rejects real voice when loudnorm failed even if technicalOk were true', () => {
    const result = computePublishEligibility({
      technicalOk: true,
      audioIsTest: false,
      loudnormStatus: 'failed',
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('narration_loudnorm:failed');
  });

  it('rejects when technical QC failed', () => {
    const result = computePublishEligibility({
      technicalOk: false,
      audioIsTest: false,
      loudnormStatus: 'verified_provenance',
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('technical_qc_failed');
  });

  it('does not treat video existence alone as eligibility', () => {
    // technicalOk false simulates missing controls even if an MP4 file exists
    const result = computePublishEligibility({
      technicalOk: false,
      audioIsTest: false,
      loudnormStatus: 'unverified',
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'technical_qc_failed',
        'narration_loudnorm:unverified',
      ]),
    );
  });
});

describe('applyNarrationLoudnormGate', () => {
  it('pushes blocking when loudnorm QC fails for real voice', () => {
    const report: Pick<QualityReport, 'blocking' | 'warnings' | 'checks'> = {
      blocking: [],
      warnings: [],
      checks: {},
    };
    applyNarrationLoudnormGate(report, {
      ok: false,
      status: 'failed',
      detail: 'render publicó audio kind=raw; no loudnorm',
      warning: 'Narración loudnorm ausente o no seleccionada en el render',
    });
    expect(report.checks.narrationLoudnorm?.ok).toBe(false);
    expect(report.blocking).toHaveLength(1);
    expect(report.blocking[0]).toMatch(/loudnorm/i);
    expect(report.warnings).toHaveLength(0);
  });

  it('does not block on mock_omitted', () => {
    const report: Pick<QualityReport, 'blocking' | 'warnings' | 'checks'> = {
      blocking: [],
      warnings: [],
      checks: {},
    };
    applyNarrationLoudnormGate(report, {
      ok: true,
      status: 'mock_omitted',
      detail: 'omitido (mock)',
    });
    expect(report.checks.narrationLoudnorm?.ok).toBe(true);
    expect(report.blocking).toHaveLength(0);
  });

  it('does not block on verified_provenance', () => {
    const report: Pick<QualityReport, 'blocking' | 'warnings' | 'checks'> = {
      blocking: [],
      warnings: [],
      checks: {},
    };
    applyNarrationLoudnormGate(report, {
      ok: true,
      status: 'verified_provenance',
      detail: 'provenance ok',
    });
    expect(report.blocking).toHaveLength(0);
  });
});

describe('runQualityCheck loudnorm gate', () => {
  let dir: string;
  let store: JobStore;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'qc-'));
    store = new JobStore(dir);
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  const seedJob = (options: {
    audioIsTest: boolean;
    provenanceKind?: 'loudnorm' | 'raw' | 'mock';
    withLoudnormFile?: boolean;
  }) => {
    const config = {...loadConfig(), outputDir: dir, width: 1080, height: 1920};
    const job = createEmptyJob('qc-demo', 'QC Demo', config);
    store.save(job);
    const jobDir = store.jobDir(job.id);

    const scriptPath = path.join(jobDir, 'script.json');
    writeFileSync(scriptPath, JSON.stringify(minimalScript, null, 2));
    job.artifacts.scriptJson = scriptPath;

    const videoPath = path.join(jobDir, 'video.mp4');
    writeFileSync(videoPath, Buffer.alloc(12_000, 1));
    job.artifacts.videoMp4 = videoPath;

    const raw = path.join(jobDir, 'narration.wav');
    writeFileSync(raw, 'raw-audio-bytes');
    job.artifacts.narrationAudio = raw;

    let ln: string | undefined;
    if (options.withLoudnormFile) {
      ln = path.join(jobDir, 'narration-loudnorm.wav');
      writeFileSync(ln, 'loudnorm-audio-bytes');
      job.artifacts.narrationLoudnorm = ln;
    }

    job.audioIsTest = options.audioIsTest;
    job.render = {
      durationSeconds: 30,
      width: 1080,
      height: 1920,
    };

    if (options.provenanceKind) {
      const sourcePath =
        options.provenanceKind === 'loudnorm' && ln ? ln : raw;
      const provenance = {
        sourcePath,
        kind: options.provenanceKind,
        sha1: sha1File(sourcePath),
        publicFile: 'shorts/qc-demo/narration.wav',
        recordedAt: new Date().toISOString(),
      };
      job.render.narrationProvenance = provenance;
      writeFileSync(
        path.join(jobDir, 'render-narration.json'),
        JSON.stringify(provenance, null, 2),
      );
    }

    store.save(job);
    return {job, config};
  };

  it('blocks technical QC for real voice when loudnorm provenance is raw', () => {
    const {job, config} = seedJob({
      audioIsTest: false,
      provenanceKind: 'raw',
      withLoudnormFile: true,
    });

    expect(() => runQualityCheck(store, job, config)).toThrow(/loudnorm/i);

    const reloaded = store.load('qc-demo')!;
    expect(reloaded.status).toBe('failed');
    expect(reloaded.phases.quality_check?.status).toBe('failed');

    const report = JSON.parse(
      readFileSync(path.join(store.jobDir('qc-demo'), 'report.json'), 'utf8'),
    ) as QualityReport;
    expect(report.ok).toBe(false);
    expect(report.blocking.length).toBeGreaterThan(0);
    expect(report.publishEligibility.eligible).toBe(false);
    expect(report.publishEligibility.reasons).toEqual(
      expect.arrayContaining([
        'technical_qc_failed',
        expect.stringMatching(/narration_loudnorm/),
      ]),
    );
  });

  it('blocks technical QC for real voice when provenance is missing', () => {
    const {job, config} = seedJob({
      audioIsTest: false,
      withLoudnormFile: true,
    });

    expect(() => runQualityCheck(store, job, config)).toThrow();

    const report = JSON.parse(
      readFileSync(path.join(store.jobDir('qc-demo'), 'report.json'), 'utf8'),
    ) as QualityReport;
    expect(report.ok).toBe(false);
    expect(report.checks.narrationLoudnorm?.ok).toBe(false);
    expect(report.publishEligibility.eligible).toBe(false);
  });

  it('passes technical QC for mock but never marks publishable', () => {
    const {job, config} = seedJob({audioIsTest: true});

    const done = runQualityCheck(store, job, config);
    expect(done.phases.quality_check?.status).toBe('done');

    const reportPath = path.join(store.jobDir('qc-demo'), 'report.json');
    expect(existsSync(reportPath)).toBe(true);
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as QualityReport;
    expect(report.ok).toBe(true);
    expect(report.checks.narrationLoudnorm?.detail).toMatch(/mock_omitted/);
    expect(report.publishEligibility.eligible).toBe(false);
    expect(report.publishEligibility.reasons).toContain('audio_mock');
    expect(report.publishEligibility.reasons).toContain('mock_omitted');
  });

  it('passes technical QC and is eligible for real voice with verified loudnorm', () => {
    const {job, config} = seedJob({
      audioIsTest: false,
      provenanceKind: 'loudnorm',
      withLoudnormFile: true,
    });

    const done = runQualityCheck(store, job, config);
    expect(done.phases.quality_check?.status).toBe('done');

    const report = JSON.parse(
      readFileSync(path.join(store.jobDir('qc-demo'), 'report.json'), 'utf8'),
    ) as QualityReport;
    expect(report.ok).toBe(true);
    expect(report.checks.narrationLoudnorm?.ok).toBe(true);
    expect(report.publishEligibility.eligible).toBe(true);
    expect(report.publishEligibility.reasons).toEqual([]);
  });
});
