import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  ensureNarrationLoudnorm,
  evaluateNarrationLoudnormQc,
  resolveNarrationForRender,
  selectNarrationSourceForRender,
  sha1File,
} from '../../src/shorts/media/narration-loudnorm';
import {ffmpegAvailable} from '../../src/shorts/media/ffmpeg';
import {
  clearPublishedNarration,
  publishNarrationAudio,
} from '../../src/shorts/media/public-audio';

describe('resolveNarrationForRender', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ln-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('prefers loudnorm when not test audio', () => {
    const raw = path.join(dir, 'narration.wav');
    const ln = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(raw, 'raw');
    writeFileSync(ln, 'ln');
    expect(
      resolveNarrationForRender({
        narrationAudio: raw,
        narrationLoudnorm: ln,
        isTestAudio: false,
      }),
    ).toBe(ln);
  });

  it('uses raw narration for mock audio even if loudnorm exists', () => {
    const raw = path.join(dir, 'narration.wav');
    const ln = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(raw, 'raw');
    writeFileSync(ln, 'ln');
    expect(
      resolveNarrationForRender({
        narrationAudio: raw,
        narrationLoudnorm: ln,
        isTestAudio: true,
      }),
    ).toBe(raw);
  });

  it('falls back to raw when loudnorm missing', () => {
    const raw = path.join(dir, 'narration.wav');
    writeFileSync(raw, 'raw');
    expect(
      resolveNarrationForRender({
        narrationAudio: raw,
        isTestAudio: false,
      }),
    ).toBe(raw);
  });
});

describe('selectNarrationSourceForRender', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ln-sel-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('selects loudnorm with kind=loudnorm for non-mock', () => {
    const raw = path.join(dir, 'narration.wav');
    const ln = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(raw, 'raw-bytes');
    writeFileSync(ln, 'loudnorm-bytes');
    expect(
      selectNarrationSourceForRender({
        narrationAudio: raw,
        narrationLoudnorm: ln,
        isTestAudio: false,
      }),
    ).toEqual({path: ln, kind: 'loudnorm'});
  });

  it('selects raw with kind=raw when loudnorm missing', () => {
    const raw = path.join(dir, 'narration.wav');
    writeFileSync(raw, 'raw-bytes');
    expect(
      selectNarrationSourceForRender({
        narrationAudio: raw,
        isTestAudio: false,
      }),
    ).toEqual({path: raw, kind: 'raw'});
  });

  it('selects mock with kind=mock even if loudnorm path exists', () => {
    const raw = path.join(dir, 'narration.wav');
    const ln = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(raw, 'mock');
    writeFileSync(ln, 'should-not-use');
    expect(
      selectNarrationSourceForRender({
        narrationAudio: raw,
        narrationLoudnorm: ln,
        isTestAudio: true,
      }),
    ).toEqual({path: raw, kind: 'mock'});
  });
});

describe('evaluateNarrationLoudnormQc', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ln-qc-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('omits check for mock audio', () => {
    const result = evaluateNarrationLoudnormQc({audioIsTest: true});
    expect(result.ok).toBe(true);
    expect(result.status).toBe('mock_omitted');
  });

  it('fails when loudnorm WAV appears only after a raw render (post-render case)', () => {
    const raw = path.join(dir, 'narration.wav');
    const ln = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(raw, 'raw-audio-content');
    // Simulate post_process creating loudnorm after MP4 was baked with raw
    writeFileSync(ln, 'normalized-later');

    const result = evaluateNarrationLoudnormQc({
      audioIsTest: false,
      narrationAudio: raw,
      narrationLoudnorm: ln,
      provenance: {
        sourcePath: raw,
        kind: 'raw',
        sha1: sha1File(raw),
        publicFile: 'shorts/job/narration-abc.wav',
        recordedAt: '2026-10-19T10:00:00.000Z',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.detail).toMatch(/post-render/i);
    expect(result.warning).toBeTruthy();
  });

  it('marks unverified when provenance is missing even if loudnorm file exists', () => {
    const ln = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(ln, 'exists-but-no-provenance');
    const result = evaluateNarrationLoudnormQc({
      audioIsTest: false,
      narrationLoudnorm: ln,
      provenance: null,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('unverified');
  });

  it('passes with verified_provenance when render published loudnorm bytes', () => {
    const ln = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(ln, 'loudnorm-published-bytes');
    const sha1 = sha1File(ln);
    const result = evaluateNarrationLoudnormQc({
      audioIsTest: false,
      narrationLoudnorm: ln,
      provenance: {
        sourcePath: ln,
        kind: 'loudnorm',
        sha1,
        publicFile: 'shorts/job/narration-deadbeef.wav',
        recordedAt: '2026-10-19T10:00:00.000Z',
      },
    });
    expect(result.ok).toBe(true);
    expect(result.status).toBe('verified_provenance');
    expect(result.detail).toMatch(/no re-extraído/);
  });

  it('marks unverified when loudnorm file hash diverges from provenance', () => {
    const ln = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(ln, 'current-bytes');
    const result = evaluateNarrationLoudnormQc({
      audioIsTest: false,
      narrationLoudnorm: ln,
      provenance: {
        sourcePath: ln,
        kind: 'loudnorm',
        sha1: '0'.repeat(40),
        publicFile: 'shorts/job/narration-000.wav',
        recordedAt: '2026-10-19T10:00:00.000Z',
      },
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('unverified');
  });
});

describe('publishNarrationAudio + loudnorm selection (integration)', () => {
  let dir: string;
  const jobId = `ln-pub-${Date.now().toString(36)}`;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ln-pub-'));
  });

  afterEach(() => {
    clearPublishedNarration(jobId);
    rmSync(dir, {recursive: true, force: true});
  });

  it('published public file bytes match the selected loudnorm WAV', () => {
    const raw = path.join(dir, 'narration.wav');
    const ln = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(raw, 'raw-should-not-publish');
    writeFileSync(ln, 'loudnorm-must-publish');

    const selected = selectNarrationSourceForRender({
      narrationAudio: raw,
      narrationLoudnorm: ln,
      isTestAudio: false,
    });
    expect(selected.kind).toBe('loudnorm');
    expect(selected.path).toBe(ln);

    const published = publishNarrationAudio(jobId, selected.path!);
    expect(published.sha1).toBe(sha1File(ln));
    expect(published.sha1).not.toBe(sha1File(raw));

    const abs = path.join(process.cwd(), 'public', published.publicFile);
    expect(existsSync(abs)).toBe(true);
    expect(readFileSync(abs, 'utf8')).toBe('loudnorm-must-publish');

    const qc = evaluateNarrationLoudnormQc({
      audioIsTest: false,
      narrationLoudnorm: ln,
      narrationAudio: raw,
      provenance: {
        sourcePath: selected.path!,
        kind: selected.kind!,
        sha1: published.sha1,
        publicFile: published.publicFile,
        recordedAt: new Date().toISOString(),
      },
    });
    expect(qc.ok).toBe(true);
    expect(qc.status).toBe('verified_provenance');
  });
});

describe('ensureNarrationLoudnorm', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ln-ens-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('skips loudnorm for test audio and removes stale file', () => {
    const raw = path.join(dir, 'narration.wav');
    const stale = path.join(dir, 'narration-loudnorm.wav');
    writeFileSync(raw, 'raw');
    writeFileSync(stale, 'stale');
    const result = ensureNarrationLoudnorm({
      jobDir: dir,
      narrationAudio: raw,
      isTestAudio: true,
    });
    expect(result.applied).toBe(false);
    expect(result.usedPath).toBe(raw);
    expect(existsSync(stale)).toBe(false);
  });

  it('applies loudnorm when ffmpeg is available', () => {
    if (!ffmpegAvailable()) return;
    // Minimal valid-ish WAV header + silence so ffmpeg can read it
    const raw = path.join(dir, 'narration.wav');
    const sampleRate = 24000;
    const samples = sampleRate; // 1s silence
    const dataSize = samples * 2;
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
    writeFileSync(raw, buf);

    const result = ensureNarrationLoudnorm({
      jobDir: dir,
      narrationAudio: raw,
      isTestAudio: false,
    });
    expect(result.applied).toBe(true);
    expect(result.loudnormPath).toBeTruthy();
    expect(existsSync(result.loudnormPath!)).toBe(true);
    expect(result.usedPath).toBe(result.loudnormPath);
  });
});

describe('post-process must not mint loudnorm for QC', () => {
  it('documents that file existence after raw provenance fails QC', () => {
    // Architectural guard: even if a future post_process wrote the sidecar,
    // evaluateNarrationLoudnormQc must reject it when provenance.kind === 'raw'.
    const dir = mkdtempSync(path.join(tmpdir(), 'ln-post-'));
    try {
      mkdirSync(dir, {recursive: true});
      const raw = path.join(dir, 'narration.wav');
      const ln = path.join(dir, 'narration-loudnorm.wav');
      writeFileSync(raw, 'embedded-in-mp4');
      writeFileSync(ln, 'created-in-post-process');
      const qc = evaluateNarrationLoudnormQc({
        audioIsTest: false,
        narrationAudio: raw,
        narrationLoudnorm: ln,
        provenance: {
          sourcePath: raw,
          kind: 'raw',
          sha1: sha1File(raw),
          publicFile: 'shorts/x/narration.wav',
          recordedAt: '2026-10-19T12:00:00.000Z',
        },
      });
      expect(qc.ok).toBe(false);
      expect(qc.detail).toMatch(/post-render|narration\.wav/i);
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }
  });
});
