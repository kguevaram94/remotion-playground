import {spawn} from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import type {VoiceProvider, VoiceResult} from './provider';

/** Dedicated timeout — cold start + generate; do not reuse SHORTS_REQUEST_TIMEOUT_MS. */
export const CHATTERBOX_DEFAULT_TIMEOUT_MS = 300_000;

export const CHATTERBOX_TARGET_SAMPLE_RATE = 24_000;
export const CHATTERBOX_MODEL_ID = 'ResembleAI/Chatterbox-Multilingual-es-es';

export const CHATTERBOX_DEVICES = ['auto', 'mps', 'cpu', 'cuda'] as const;
export type ChatterboxDevice = (typeof CHATTERBOX_DEVICES)[number];

export type ChatterboxSpawnResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  spawnError?: NodeJS.ErrnoException;
};

export type ChatterboxSpawnFn = (
  command: string,
  args: readonly string[],
  options: {timeoutMs: number},
) => Promise<ChatterboxSpawnResult>;

export type ChatterboxProviderOptions = {
  pythonPath: string;
  scriptPath: string;
  ckptDir: string;
  refWav: string;
  device: ChatterboxDevice;
  timeoutMs: number;
  languageId?: string;
  exaggeration?: number;
  cfgWeight?: number;
  temperature?: number;
  /** Test seam — defaults to a real one-shot child_process spawn (no shell). */
  spawnFn?: ChatterboxSpawnFn;
};

type WavProbe = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  audioFormat: number;
  durationSeconds: number;
  dataBytes: number;
};

type ChatterboxMeta = {
  ok?: unknown;
  output_wav?: unknown;
  text_chars?: unknown;
  device_requested?: unknown;
  model_id?: unknown;
  audio?: {sample_count?: unknown; duration_seconds?: unknown};
  [key: string]: unknown;
};

const buildWordCues = (text: string, durationSeconds: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const msEach = (durationSeconds * 1000) / Math.max(1, words.length);
  let cursor = 0;
  return words.map((w) => {
    const startMs = cursor;
    const endMs = cursor + msEach;
    cursor = endMs;
    return {text: w, startMs, endMs};
  });
};

/** Basename-only path for logs/errors — avoids leaking home directories. */
export const safePathLabel = (filePath: string): string => {
  const base = path.basename(filePath);
  return base || '(path)';
};

const truncateForLog = (value: string, max = 240): string => {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
};

/**
 * Probe PCM WAV header without external deps.
 * Contract: PCM16 (format=1), mono, 24 kHz, duration > 0.
 */
export const probePcm16MonoWav = (filePath: string): WavProbe => {
  if (!existsSync(filePath)) {
    throw new Error(`WAV ausente: ${safePathLabel(filePath)}`);
  }
  const st = statSync(filePath);
  if (st.size < 44) {
    throw new Error(`WAV vacío o demasiado corto: ${safePathLabel(filePath)}`);
  }

  const buf = readFileSync(filePath);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`No es RIFF/WAVE: ${safePathLabel(filePath)}`);
  }

  let audioFormat = 0;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataBytes = 0;
  let foundFmt = false;
  let foundData = false;

  let offset = 12;
  while (offset < buf.length - 8) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (id === 'fmt ' && size >= 16) {
      audioFormat = buf.readUInt16LE(payload);
      channels = buf.readUInt16LE(payload + 2);
      sampleRate = buf.readUInt32LE(payload + 4);
      bitsPerSample = buf.readUInt16LE(payload + 14);
      foundFmt = true;
    } else if (id === 'data') {
      dataBytes =
        size === 0xffffffff
          ? Math.max(0, buf.length - (payload))
          : size;
      foundData = true;
      break;
    }
    offset += 8 + (size === 0xffffffff ? 0 : size);
    if (size === 0xffffffff) break;
  }

  if (!foundFmt) {
    throw new Error(`WAV sin chunk fmt: ${safePathLabel(filePath)}`);
  }
  if (!foundData) {
    throw new Error(`WAV sin chunk data: ${safePathLabel(filePath)}`);
  }

  return {
    audioFormat,
    channels,
    sampleRate,
    bitsPerSample,
    dataBytes,
    durationSeconds:
      sampleRate > 0 && channels > 0 && bitsPerSample > 0
        ? dataBytes / ((bitsPerSample / 8) * channels) / sampleRate
        : 0,
  };
};

export const assertChatterboxWav = (filePath: string): WavProbe => {
  const probe = probePcm16MonoWav(filePath);
  if (probe.audioFormat !== 1) {
    throw new Error(
      `WAV no es PCM (audioFormat=${probe.audioFormat}): ${safePathLabel(filePath)}`,
    );
  }
  if (probe.bitsPerSample !== 16) {
    throw new Error(
      `WAV no es PCM16 (bits=${probe.bitsPerSample}): ${safePathLabel(filePath)}`,
    );
  }
  if (probe.channels !== 1) {
    throw new Error(
      `WAV no es mono (channels=${probe.channels}): ${safePathLabel(filePath)}`,
    );
  }
  if (probe.sampleRate !== CHATTERBOX_TARGET_SAMPLE_RATE) {
    throw new Error(
      `WAV sampleRate=${probe.sampleRate} (esperado ${CHATTERBOX_TARGET_SAMPLE_RATE}): ${safePathLabel(filePath)}`,
    );
  }
  if (probe.dataBytes <= 0 || !(probe.durationSeconds > 0)) {
    throw new Error(
      `WAV sin muestras / duración≤0: ${safePathLabel(filePath)}`,
    );
  }
  return probe;
};

export const buildChatterboxArgs = (opts: {
  scriptPath: string;
  text: string;
  outputPath: string;
  refWav: string;
  ckptDir: string;
  device: ChatterboxDevice;
  metaOut: string;
  languageId?: string;
  exaggeration?: number;
  cfgWeight?: number;
  temperature?: number;
}): string[] => {
  // argv array only — never shell-concatenate user text or paths.
  const args: string[] = [
    opts.scriptPath,
    '--text',
    opts.text,
    '--output',
    opts.outputPath,
    '--ref',
    opts.refWav,
    '--ckpt-dir',
    opts.ckptDir,
    '--device',
    opts.device,
    '--meta-out',
    opts.metaOut,
    '--force',
  ];
  if (opts.languageId !== undefined) {
    args.push('--language-id', opts.languageId);
  }
  if (opts.exaggeration !== undefined) {
    args.push('--exaggeration', String(opts.exaggeration));
  }
  if (opts.cfgWeight !== undefined) {
    args.push('--cfg-weight', String(opts.cfgWeight));
  }
  if (opts.temperature !== undefined) {
    args.push('--temperature', String(opts.temperature));
  }
  return args;
};

type SpawnImpl = typeof spawn;

/**
 * Factory for the real child_process spawn (testable; default uses node:spawn).
 * `timer` is declared before use so a synchronous spawn throw cannot hit TDZ.
 */
export const createChatterboxSpawnFn = (
  spawnImpl: SpawnImpl = spawn,
): ChatterboxSpawnFn => (command, args, {timeoutMs}) =>
  new Promise((resolve) => {
    let timedOut = false;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const finish = (result: ChatterboxSpawnResult) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      resolve(result);
    };

    let child;
    try {
      child = spawnImpl(command, [...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
        // No shell — argv is already separated.
        shell: false,
      });
    } catch (err) {
      finish({
        code: null,
        signal: null,
        stdout: '',
        stderr: '',
        timedOut: false,
        spawnError: err as NodeJS.ErrnoException,
      });
      return;
    }

    timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
      setTimeout(() => {
        try {
          if (!child.killed) child.kill('SIGKILL');
        } catch {
          // ignore
        }
      }, 2_000).unref?.();
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    child.on('error', (err: NodeJS.ErrnoException) => {
      finish({
        code: null,
        signal: null,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        timedOut,
        spawnError: err,
      });
    });

    child.on('close', (code, signal) => {
      finish({
        code,
        signal,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        timedOut,
      });
    });
  });

export const defaultChatterboxSpawn: ChatterboxSpawnFn = createChatterboxSpawnFn();

/** Snapshot of a destination path before spawn — used to detect stale reuse. */
export type ArtifactFingerprint =
  | {exists: false}
  | {exists: true; size: number; mtimeMs: number};

export const fingerprintArtifact = (filePath: string): ArtifactFingerprint => {
  if (!existsSync(filePath)) return {exists: false};
  const st = statSync(filePath);
  return {exists: true, size: st.size, mtimeMs: st.mtimeMs};
};

/**
 * True iff the path exists now and differs from the pre-spawn snapshot
 * (new file, or size/mtime changed). Does not delete anything.
 */
export const artifactUpdatedSince = (
  before: ArtifactFingerprint,
  filePath: string,
): boolean => {
  if (!existsSync(filePath)) return false;
  if (!before.exists) return true;
  const st = statSync(filePath);
  return st.size !== before.size || st.mtimeMs !== before.mtimeMs;
};

/**
 * Both WAV and meta must be produced/updated by this run — leftover matching
 * artefacts from a prior success must not count as success (audit 2A #4).
 */
export const assertOutputsFreshFromThisRun = (
  wavPath: string,
  metaPath: string,
  beforeWav: ArtifactFingerprint,
  beforeMeta: ArtifactFingerprint,
): void => {
  const wavFresh = artifactUpdatedSince(beforeWav, wavPath);
  const metaFresh = artifactUpdatedSince(beforeMeta, metaPath);
  if (wavFresh && metaFresh) return;

  const parts: string[] = [];
  if (!wavFresh) {
    parts.push(
      beforeWav.exists
        ? `WAV sin cambios desde antes del spawn (${safePathLabel(wavPath)})`
        : `WAV ausente tras exit 0 (${safePathLabel(wavPath)})`,
    );
  }
  if (!metaFresh) {
    parts.push(
      beforeMeta.exists
        ? `meta sin cambios desde antes del spawn (${safePathLabel(metaPath)})`
        : `meta ausente tras exit 0 (${safePathLabel(metaPath)})`,
    );
  }
  throw new Error(
    `Artefactos no actualizados en esta ejecución (posible reuso de WAV/meta previos): ${parts.join('; ')}`,
  );
};

const pathsReferSameFile = (a: string, b: string): boolean => {
  try {
    return path.resolve(a) === path.resolve(b);
  } catch {
    return a === b;
  }
};

export const assertChatterboxMeta = (
  metaPath: string,
  expected: {
    outputPath: string;
    textChars: number;
    deviceRequested: ChatterboxDevice;
  },
): ChatterboxMeta => {
  if (!existsSync(metaPath)) {
    throw new Error(
      `Metadatos Chatterbox ausentes tras la síntesis: ${safePathLabel(metaPath)}. ` +
        'Un WAV huérfano sin meta no se acepta como éxito (reserva I-R1).',
    );
  }

  let parsed: ChatterboxMeta;
  try {
    parsed = JSON.parse(readFileSync(metaPath, 'utf8')) as ChatterboxMeta;
  } catch {
    throw new Error(
      `Metadatos Chatterbox inválidos (JSON): ${safePathLabel(metaPath)}`,
    );
  }

  if (parsed.ok !== true) {
    throw new Error(
      `Metadatos Chatterbox ok≠true (${String(parsed.ok)}): ${safePathLabel(metaPath)}`,
    );
  }

  if (typeof parsed.output_wav !== 'string' || !parsed.output_wav) {
    throw new Error(
      `Metadatos sin output_wav: ${safePathLabel(metaPath)}`,
    );
  }

  if (!pathsReferSameFile(parsed.output_wav, expected.outputPath)) {
    throw new Error(
      `Metadatos output_wav no coincide con esta ejecución ` +
        `(meta=${safePathLabel(parsed.output_wav)}, expected=${safePathLabel(expected.outputPath)})`,
    );
  }

  if (parsed.text_chars !== expected.textChars) {
    throw new Error(
      `Metadatos text_chars incompatibles con esta ejecución ` +
        `(meta=${String(parsed.text_chars)}, expected=${expected.textChars})`,
    );
  }

  if (
    typeof parsed.device_requested === 'string' &&
    parsed.device_requested !== expected.deviceRequested
  ) {
    throw new Error(
      `Metadatos device_requested incompatibles ` +
        `(meta=${parsed.device_requested}, expected=${expected.deviceRequested})`,
    );
  }

  // Do not treat load_meta.weights_only / pilot notes as proof of this runtime.
  return parsed;
};

export const validateChatterboxConfig = (
  opts: Pick<
    ChatterboxProviderOptions,
    'pythonPath' | 'scriptPath' | 'ckptDir' | 'refWav' | 'device' | 'timeoutMs'
  >,
): void => {
  const missing: string[] = [];
  if (!opts.pythonPath?.trim()) missing.push('CHATTERBOX_PYTHON');
  if (!opts.scriptPath?.trim()) missing.push('CHATTERBOX_SCRIPT');
  if (!opts.ckptDir?.trim()) missing.push('CHATTERBOX_CKPT_DIR');
  if (!opts.refWav?.trim()) missing.push('CHATTERBOX_REF_WAV');
  if (missing.length) {
    throw new Error(
      `VOICE_PROVIDER=chatterbox requiere configuración: ${missing.join(', ')}. ` +
        'Define rutas locales en .env (placeholders en .env.example). ' +
        'No se degrada a mock.',
    );
  }
  if (
    !(CHATTERBOX_DEVICES as readonly string[]).includes(opts.device)
  ) {
    throw new Error(
      `CHATTERBOX_DEVICE inválido: ${opts.device}. ` +
        `Usa: ${CHATTERBOX_DEVICES.join('|')}. No se degrada a mock.`,
    );
  }
  if (!Number.isFinite(opts.timeoutMs) || opts.timeoutMs <= 0) {
    throw new Error(
      `CHATTERBOX_TIMEOUT_MS inválido (${opts.timeoutMs}). Debe ser > 0 (default ${CHATTERBOX_DEFAULT_TIMEOUT_MS}).`,
    );
  }
};

/**
 * One-shot Node wrapper around tools/chatterbox/synthesize.py.
 * Ephemeral child process per synthesize(); never keeps the model loaded.
 */
export class ChatterboxVoiceProvider implements VoiceProvider {
  readonly name = 'chatterbox';

  private readonly spawnFn: ChatterboxSpawnFn;

  constructor(private readonly options: ChatterboxProviderOptions) {
    validateChatterboxConfig(options);
    this.spawnFn = options.spawnFn ?? defaultChatterboxSpawn;
  }

  async synthesize(text: string, outputPath: string): Promise<VoiceResult> {
    if (!text.trim()) {
      throw new Error('chatterbox: texto de narración vacío');
    }

    mkdirSync(path.dirname(outputPath), {recursive: true});
    const metaOut = `${outputPath}.chatterbox-meta.json`;
    // Snapshot destinations only — do not delete caller/preexisting paths.
    const beforeWav = fingerprintArtifact(outputPath);
    const beforeMeta = fingerprintArtifact(metaOut);
    const args = buildChatterboxArgs({
      scriptPath: this.options.scriptPath,
      text,
      outputPath,
      refWav: this.options.refWav,
      ckptDir: this.options.ckptDir,
      device: this.options.device,
      metaOut,
      languageId: this.options.languageId,
      exaggeration: this.options.exaggeration,
      cfgWeight: this.options.cfgWeight,
      temperature: this.options.temperature,
    });

    process.stdout.write(
      `[shorts] chatterbox: spawn python=${safePathLabel(this.options.pythonPath)} ` +
        `script=${safePathLabel(this.options.scriptPath)} ` +
        `device=${this.options.device} text_chars=${text.length} ` +
        `timeout_ms=${this.options.timeoutMs}\n`,
    );

    const result = await this.spawnFn(
      this.options.pythonPath,
      args,
      {timeoutMs: this.options.timeoutMs},
    );

    if (result.spawnError) {
      const code = result.spawnError.code ? ` (${result.spawnError.code})` : '';
      throw new Error(
        `chatterbox: no se pudo iniciar el proceso Python${code}: ` +
          `${result.spawnError.message}. ` +
          `python=${safePathLabel(this.options.pythonPath)} ` +
          `script=${safePathLabel(this.options.scriptPath)}. No se degrada a mock.`,
      );
    }

    if (result.timedOut) {
      throw new Error(
        `chatterbox: timeout tras ${this.options.timeoutMs} ms ` +
          `(text_chars=${text.length}, device=${this.options.device}). ` +
          'Ajusta CHATTERBOX_TIMEOUT_MS si el cold-start es mayor. No se degrada a mock.',
      );
    }

    if (result.code !== 0) {
      const detail = truncateForLog(result.stderr || result.stdout || 'sin salida');
      throw new Error(
        `chatterbox: CLI exit=${result.code ?? 'null'}` +
          (result.signal ? ` signal=${result.signal}` : '') +
          ` text_chars=${text.length}. ${detail}. No se degrada a mock.`,
      );
    }

    // Exit 0 is necessary but not sufficient: artefacts must be from this run.
    try {
      assertOutputsFreshFromThisRun(outputPath, metaOut, beforeWav, beforeMeta);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `chatterbox: exit 0 pero ${msg}. No se acepta como éxito.`,
      );
    }

    // Then require valid WAV + meta structure (I-R1: orphan WAV ≠ success).
    let probe: WavProbe;
    try {
      probe = assertChatterboxWav(outputPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `chatterbox: exit 0 pero WAV inválido/ausente (${msg}). No se acepta como éxito.`,
      );
    }

    let meta: ChatterboxMeta;
    try {
      meta = assertChatterboxMeta(metaOut, {
        outputPath,
        textChars: text.length,
        deviceRequested: this.options.device,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `chatterbox: exit 0 pero metadatos inválidos/ausentes (${msg}). ` +
          'WAV huérfano no se trata como éxito.',
      );
    }

    const model =
      typeof meta.model_id === 'string' && meta.model_id
        ? meta.model_id
        : CHATTERBOX_MODEL_ID;

    return {
      audioPath: outputPath,
      durationSeconds: probe.durationSeconds,
      sampleRate: probe.sampleRate,
      format: 'wav',
      provider: this.name,
      model,
      isTestAudio: false,
      cues: buildWordCues(text, probe.durationSeconds),
    };
  }
}
