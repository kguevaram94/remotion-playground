import {describe, expect, it, beforeEach, afterEach} from 'vitest';
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
  DEFAULT_CHATTERBOX_SCRIPT,
  DEFAULT_CHATTERBOX_TIMEOUT_MS,
  loadConfig,
  type AppConfig,
} from '../../src/shorts/config/env';
import {DEFAULTS} from '../../src/shorts/config/defaults';
import {createVoiceProvider} from '../../src/shorts/voice/provider';
import {
  ChatterboxVoiceProvider,
  CHATTERBOX_DEFAULT_TIMEOUT_MS,
  CHATTERBOX_MODEL_ID,
  CHATTERBOX_TARGET_SAMPLE_RATE,
  buildChatterboxArgs,
  createChatterboxSpawnFn,
  safePathLabel,
  type ChatterboxSpawnFn,
  type ChatterboxSpawnResult,
} from '../../src/shorts/voice/chatterbox';

/** Minimal PCM16 mono 24 kHz WAV (≥1 sample). */
const writePcm16Mono24k = (
  filePath: string,
  numSamples = 2400,
): void => {
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(CHATTERBOX_TARGET_SAMPLE_RATE, 24);
  buffer.writeUInt32LE(CHATTERBOX_TARGET_SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(Math.floor(Math.sin(i / 10) * 1000), 44 + i * 2);
  }
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, buffer);
};

const writeMeta = (
  metaPath: string,
  partial: Record<string, unknown>,
): void => {
  writeFileSync(metaPath, JSON.stringify({ok: true, ...partial}, null, 2));
};

/** Deterministic AppConfig — does not read the developer's local .env. */
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
  requestTimeoutMs: DEFAULTS.requestTimeoutMs,
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

describe('chatterbox voice provider (fase 2A · sin inferencia real)', () => {
  let dir: string;
  const secretText =
    'TEXTO_SECRETO_DE_NARRACION_QUE_NO_DEBE_APARECER_EN_ERRORES_12345';
  const personalPathHint = '/Users/someone/private/ref-voice.wav';

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'cb-voice-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('factory selects chatterbox when requested explicitly', () => {
    const provider = createVoiceProvider(
      baseConfig({
        voiceProvider: 'chatterbox',
        chatterboxPython: '/opt/venv/bin/python',
        chatterboxCkptDir: '/opt/ckpts',
        chatterboxRefWav: '/opt/ref.wav',
      }),
    );
    expect(provider.name).toBe('chatterbox');
    expect(provider).toBeInstanceOf(ChatterboxVoiceProvider);
  });

  it('keeps existing providers and default provider unchanged', () => {
    expect(DEFAULTS.voiceProvider === 'macos-say' || DEFAULTS.voiceProvider === 'mock').toBe(
      true,
    );
    expect(createVoiceProvider(baseConfig({voiceProvider: 'mock'})).name).toBe(
      'mock',
    );
    expect(
      createVoiceProvider(baseConfig({voiceProvider: 'macos-say'})).name,
    ).toBe('macos-say');
    expect(
      createVoiceProvider(
        baseConfig({
          voiceProvider: 'openai-tts',
          voiceApiKey: 'sk-test',
        }),
      ).name,
    ).toBe('openai-tts');
    expect(
      createVoiceProvider(
        baseConfig({
          voiceProvider: 'elevenlabs',
          elevenLabsApiKey: 'el-test',
          elevenLabsVoiceId: 'vid',
        }),
      ).name,
    ).toBe('elevenlabs');
    expect(createVoiceProvider(baseConfig({voiceProvider: 'file'})).name).toBe(
      'file',
    );
    // Default provider name from DEFAULTS is unchanged by chatterbox registration
    expect(['macos-say', 'mock']).toContain(DEFAULTS.voiceProvider);
    expect(DEFAULTS.voiceProvider).not.toBe('chatterbox');
    const defaultProvider = createVoiceProvider(
      baseConfig({
        voiceProvider: DEFAULTS.voiceProvider as AppConfig['voiceProvider'],
      }),
    );
    expect(defaultProvider.name).toBe(DEFAULTS.voiceProvider);
  });

  it('missing required config throws clear error (no mock fallback)', () => {
    expect(() =>
      createVoiceProvider(
        baseConfig({
          voiceProvider: 'chatterbox',
          chatterboxPython: undefined,
          chatterboxCkptDir: '/opt/ckpts',
          chatterboxRefWav: '/opt/ref.wav',
        }),
      ),
    ).toThrow(/CHATTERBOX_PYTHON/);

    expect(() =>
      createVoiceProvider(
        baseConfig({
          voiceProvider: 'chatterbox',
          // incomplete on purpose
          chatterboxPython: '/opt/venv/bin/python',
        }),
      ),
    ).toThrow(/No se degrada a mock/);
  });

  it('explicit invalid chatterbox selection never silently becomes mock', () => {
    let threw = false;
    try {
      createVoiceProvider(
        baseConfig({
          voiceProvider: 'chatterbox',
          chatterboxPython: '',
          chatterboxCkptDir: '',
          chatterboxRefWav: '',
        }),
      );
    } catch (err) {
      threw = true;
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toMatch(/chatterbox/i);
      expect(msg).toMatch(/No se degrada a mock/);
    }
    expect(threw).toBe(true);
  });

  it('buildChatterboxArgs passes text/paths as separate argv (no shell concat)', () => {
    const text = 'hola; rm -rf /';
    const args = buildChatterboxArgs({
      scriptPath: 'tools/chatterbox/synthesize.py',
      text,
      outputPath: '/tmp/out.wav',
      refWav: '/tmp/ref.wav',
      ckptDir: '/tmp/ckpts',
      device: 'mps',
      metaOut: '/tmp/out.meta.json',
    });
    expect(args[0]).toBe('tools/chatterbox/synthesize.py');
    const textIdx = args.indexOf('--text');
    // Entire text is one argv element — shell metacharacters stay data, not syntax
    expect(args[textIdx + 1]).toBe(text);
    expect(args[textIdx + 1]).toContain(';');
    // No shell wrapper: we never produce a single concatenated command string for exec
    expect(args.every((a) => typeof a === 'string')).toBe(true);
    expect(args).toContain('--ref');
    expect(args).toContain('/tmp/ref.wav');
    expect(args).toContain('--ckpt-dir');
    expect(args).toContain('--meta-out');
    expect(args).toContain('--force');
    expect(args).toContain('mps');
  });

  it('default timeout is 300000 ms (not requestTimeout 60s)', () => {
    expect(CHATTERBOX_DEFAULT_TIMEOUT_MS).toBe(300_000);
    expect(DEFAULT_CHATTERBOX_TIMEOUT_MS).toBe(300_000);
    expect(CHATTERBOX_DEFAULT_TIMEOUT_MS).not.toBe(DEFAULTS.requestTimeoutMs);
  });

  it('simulated success yields a valid VoiceResult', async () => {
    const out = path.join(dir, 'ok.wav');
    const text = 'Hola mundo corto';
    const spawnFn: ChatterboxSpawnFn = async (_cmd, args) => {
      const outIdx = args.indexOf('--output');
      const metaIdx = args.indexOf('--meta-out');
      const textIdx = args.indexOf('--text');
      const outputPath = String(args[outIdx + 1]);
      const metaPath = String(args[metaIdx + 1]);
      const passedText = String(args[textIdx + 1]);
      writePcm16Mono24k(outputPath, 4800);
      writeMeta(metaPath, {
        output_wav: outputPath,
        text_chars: passedText.length,
        device_requested: 'auto',
        model_id: CHATTERBOX_MODEL_ID,
      });
      return {
        code: 0,
        signal: null,
        stdout: '{"ok":true}',
        stderr: '',
        timedOut: false,
      };
    };

    const provider = new ChatterboxVoiceProvider({
      pythonPath: 'python3.11',
      scriptPath: path.join(dir, 'fake-synthesize.py'),
      ckptDir: path.join(dir, 'ckpts'),
      refWav: path.join(dir, 'ref.wav'),
      device: 'auto',
      timeoutMs: CHATTERBOX_DEFAULT_TIMEOUT_MS,
      spawnFn,
    });

    const result = await provider.synthesize(text, out);
    expect(result.provider).toBe('chatterbox');
    expect(result.isTestAudio).toBe(false);
    expect(result.format).toBe('wav');
    expect(result.sampleRate).toBe(24_000);
    expect(result.durationSeconds).toBeGreaterThan(0);
    expect(result.model).toBe(CHATTERBOX_MODEL_ID);
    expect(existsSync(out)).toBe(true);
    expect(result.audioPath).toBe(out);
  });

  it('non-zero exit is rejected even if WAV exists', async () => {
    const out = path.join(dir, 'fail.wav');
    writePcm16Mono24k(out);
    const spawnFn: ChatterboxSpawnFn = async () => {
      return {
        code: 1,
        signal: null,
        stdout: '',
        stderr: JSON.stringify({ok: false, error: 'boom'}),
        timedOut: false,
      };
    };
    const provider = new ChatterboxVoiceProvider({
      pythonPath: 'python3.11',
      scriptPath: 'synthesize.py',
      ckptDir: '/ckpts',
      refWav: '/ref.wav',
      device: 'auto',
      timeoutMs: 30_000,
      spawnFn,
    });
    await expect(provider.synthesize('hola', out)).rejects.toThrow(/exit=1/);
  });

  it('spawn error is rejected (no mock)', async () => {
    const spawnFn: ChatterboxSpawnFn = async () => ({
      code: null,
      signal: null,
      stdout: '',
      stderr: '',
      timedOut: false,
      spawnError: Object.assign(new Error('spawn ENOENT'), {code: 'ENOENT'}),
    });
    const provider = new ChatterboxVoiceProvider({
      pythonPath: '/missing/python',
      scriptPath: 'synthesize.py',
      ckptDir: '/ckpts',
      refWav: '/ref.wav',
      device: 'cpu',
      timeoutMs: 30_000,
      spawnFn,
    });
    await expect(provider.synthesize('hola', path.join(dir, 'x.wav'))).rejects.toThrow(
      /no se pudo iniciar|ENOENT|No se degrada a mock/,
    );
  });

  it('timeout is rejected', async () => {
    const spawnFn: ChatterboxSpawnFn = async () => ({
      code: null,
      signal: 'SIGTERM',
      stdout: '',
      stderr: '',
      timedOut: true,
    });
    const provider = new ChatterboxVoiceProvider({
      pythonPath: 'python3.11',
      scriptPath: 'synthesize.py',
      ckptDir: '/ckpts',
      refWav: '/ref.wav',
      device: 'mps',
      timeoutMs: 12_345,
      spawnFn,
    });
    await expect(provider.synthesize('hola', path.join(dir, 't.wav'))).rejects.toThrow(
      /timeout.*12345/,
    );
  });

  it('rejects missing / empty / wrong-format WAV after exit 0', async () => {
    const cases: Array<{
      name: string;
      prepare: (out: string) => void;
      match: RegExp;
    }> = [
      {
        name: 'missing',
        prepare: () => {
          /* no file */
        },
        match: /WAV inválido|ausente|WAV ausente/,
      },
      {
        name: 'empty',
        prepare: (out) => writeFileSync(out, Buffer.alloc(0)),
        match: /WAV|corto|vacío/,
      },
      {
        name: 'wrong format',
        prepare: (out) => writeFileSync(out, Buffer.from('not a wav')),
        match: /WAV|RIFF|PCM/,
      },
    ];

    for (const c of cases) {
      const out = path.join(dir, `${c.name}.wav`);
      const meta = `${out}.chatterbox-meta.json`;
      const spawnFn: ChatterboxSpawnFn = async () => {
        c.prepare(out);
        writeMeta(meta, {
          output_wav: out,
          text_chars: 4,
          device_requested: 'auto',
        });
        return {
          code: 0,
          signal: null,
          stdout: '',
          stderr: '',
          timedOut: false,
        };
      };
      const provider = new ChatterboxVoiceProvider({
        pythonPath: 'python3.11',
        scriptPath: 'synthesize.py',
        ckptDir: '/ckpts',
        refWav: '/ref.wav',
        device: 'auto',
        timeoutMs: 30_000,
        spawnFn,
      });
      await expect(provider.synthesize('hola', out)).rejects.toThrow(c.match);
    }
  });

  it('rejects missing / invalid / incompatible metadata (orphan WAV not success)', async () => {
    const out = path.join(dir, 'orphan.wav');

    // Missing meta: WAV rewritten this run, meta never written → fresh-check / I-R1.
    {
      const spawnFn: ChatterboxSpawnFn = async () => {
        writePcm16Mono24k(out, 3600);
        return {
          code: 0,
          signal: null,
          stdout: '',
          stderr: '',
          timedOut: false,
        };
      };
      const provider = new ChatterboxVoiceProvider({
        pythonPath: 'python3.11',
        scriptPath: 'synthesize.py',
        ckptDir: '/ckpts',
        refWav: '/ref.wav',
        device: 'auto',
        timeoutMs: 30_000,
        spawnFn,
      });
      await expect(provider.synthesize('hola', out)).rejects.toThrow(
        /metadatos|huérfano|ausentes|meta ausente|no actualizados/i,
      );
    }

    // Invalid JSON meta (both artefacts rewritten so freshness passes)
    {
      const meta = `${out}.chatterbox-meta.json`;
      const spawnFn: ChatterboxSpawnFn = async () => {
        writePcm16Mono24k(out, 4000);
        writeFileSync(meta, '{not-json');
        return {
          code: 0,
          signal: null,
          stdout: '',
          stderr: '',
          timedOut: false,
        };
      };
      const provider = new ChatterboxVoiceProvider({
        pythonPath: 'python3.11',
        scriptPath: 'synthesize.py',
        ckptDir: '/ckpts',
        refWav: '/ref.wav',
        device: 'auto',
        timeoutMs: 30_000,
        spawnFn,
      });
      await expect(provider.synthesize('hola', out)).rejects.toThrow(/JSON|inválidos/i);
    }

    // Incompatible text_chars / output_wav (both rewritten; structural meta fails)
    {
      const meta = `${out}.chatterbox-meta.json`;
      const spawnFn: ChatterboxSpawnFn = async () => {
        writePcm16Mono24k(out, 4400);
        writeMeta(meta, {
          output_wav: path.join(dir, 'other.wav'),
          text_chars: 999,
          device_requested: 'auto',
        });
        return {
          code: 0,
          signal: null,
          stdout: '',
          stderr: '',
          timedOut: false,
        };
      };
      const provider = new ChatterboxVoiceProvider({
        pythonPath: 'python3.11',
        scriptPath: 'synthesize.py',
        ckptDir: '/ckpts',
        refWav: '/ref.wav',
        device: 'auto',
        timeoutMs: 30_000,
        spawnFn,
      });
      await expect(provider.synthesize('hola', out)).rejects.toThrow(
        /output_wav|text_chars|incompatib/i,
      );
    }
  });

  it('does not accept results from failed runs', async () => {
    const out = path.join(dir, 'failed-run.wav');
    writePcm16Mono24k(out);
    writeMeta(`${out}.chatterbox-meta.json`, {
      ok: true,
      output_wav: out,
      text_chars: 4,
      device_requested: 'auto',
    });
    const spawnFn: ChatterboxSpawnFn = async (): Promise<ChatterboxSpawnResult> => ({
      code: 2,
      signal: null,
      stdout: '',
      stderr: '{"ok":false,"error":"missing required arguments"}',
      timedOut: false,
    });
    const provider = new ChatterboxVoiceProvider({
      pythonPath: 'python3.11',
      scriptPath: 'synthesize.py',
      ckptDir: '/ckpts',
      refWav: '/ref.wav',
      device: 'auto',
      timeoutMs: 30_000,
      spawnFn,
    });
    await expect(provider.synthesize('hola', out)).rejects.toThrow(/exit=2/);
  });

  it('rejects exit 0 that reuses prior WAV+meta without updating them', async () => {
    const out = path.join(dir, 'stale.wav');
    const text = 'hola';
    writePcm16Mono24k(out, 4800);
    writeMeta(`${out}.chatterbox-meta.json`, {
      output_wav: out,
      text_chars: text.length,
      device_requested: 'auto',
      model_id: CHATTERBOX_MODEL_ID,
    });

    // Simulated CLI: exit 0 but does not rewrite destinations (stale leftovers).
    const spawnFn: ChatterboxSpawnFn = async () => ({
      code: 0,
      signal: null,
      stdout: '',
      stderr: '',
      timedOut: false,
    });
    const provider = new ChatterboxVoiceProvider({
      pythonPath: 'python3.11',
      scriptPath: 'synthesize.py',
      ckptDir: '/ckpts',
      refWav: '/ref.wav',
      device: 'auto',
      timeoutMs: 30_000,
      spawnFn,
    });

    await expect(provider.synthesize(text, out)).rejects.toThrow(
      /no actualizados|reuso|sin cambios/i,
    );
  });

  it('accepts exit 0 when preexisting destinations are rewritten', async () => {
    const out = path.join(dir, 'rewritten.wav');
    const text = 'hola';
    writePcm16Mono24k(out, 2400);
    writeMeta(`${out}.chatterbox-meta.json`, {
      output_wav: out,
      text_chars: text.length,
      device_requested: 'auto',
    });

    const spawnFn: ChatterboxSpawnFn = async (_cmd, args) => {
      const outIdx = args.indexOf('--output');
      const metaIdx = args.indexOf('--meta-out');
      const outputPath = String(args[outIdx + 1]);
      const metaPath = String(args[metaIdx + 1]);
      // Distinct size → fingerprint change even on coarse mtime filesystems.
      writePcm16Mono24k(outputPath, 7200);
      writeMeta(metaPath, {
        output_wav: outputPath,
        text_chars: text.length,
        device_requested: 'auto',
        model_id: CHATTERBOX_MODEL_ID,
      });
      return {
        code: 0,
        signal: null,
        stdout: '',
        stderr: '',
        timedOut: false,
      };
    };
    const provider = new ChatterboxVoiceProvider({
      pythonPath: 'python3.11',
      scriptPath: 'synthesize.py',
      ckptDir: '/ckpts',
      refWav: '/ref.wav',
      device: 'auto',
      timeoutMs: 30_000,
      spawnFn,
    });

    const result = await provider.synthesize(text, out);
    expect(result.provider).toBe('chatterbox');
    expect(result.durationSeconds).toBeGreaterThan(0);
  });

  it('sync spawn throw surfaces as spawnError (no timer TDZ)', async () => {
    const spawnFn = createChatterboxSpawnFn((() => {
      throw Object.assign(new Error('sync spawn boom'), {
        code: 'ERR_INVALID_ARG_TYPE',
      });
    }) as typeof import('node:child_process').spawn);

    const result = await spawnFn('python', ['synthesize.py'], {timeoutMs: 5_000});
    expect(result.spawnError).toBeDefined();
    expect(result.spawnError?.message).toMatch(/sync spawn boom/);
    expect(result.timedOut).toBe(false);
    expect(result.code).toBeNull();
  });

  it('logs/errors do not expose full narration text or unnecessary personal paths', async () => {
    const spawnFn: ChatterboxSpawnFn = async () => ({
      code: 1,
      signal: null,
      stdout: '',
      stderr: 'generation failed',
      timedOut: false,
    });
    const provider = new ChatterboxVoiceProvider({
      pythonPath: '/opt/venv/bin/python',
      scriptPath: '/opt/tools/synthesize.py',
      ckptDir: '/opt/ckpts',
      refWav: personalPathHint,
      device: 'auto',
      timeoutMs: 30_000,
      spawnFn,
    });

    let message = '';
    try {
      await provider.synthesize(secretText, path.join(dir, 'x.wav'));
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toBeTruthy();
    expect(message).not.toContain(secretText);
    expect(message).toMatch(/text_chars=/);
    expect(message).not.toContain(personalPathHint);
    expect(safePathLabel(personalPathHint)).toBe('ref-voice.wav');
    expect(safePathLabel(personalPathHint)).not.toContain('/Users/');
  });

  it('passes dedicated timeout to spawn (not 60s request timeout)', async () => {
    let seenTimeout = 0;
    const spawnFn: ChatterboxSpawnFn = async (_c, _a, opts) => {
      seenTimeout = opts.timeoutMs;
      const out = path.join(dir, 'to.wav');
      writePcm16Mono24k(out);
      writeMeta(`${out}.chatterbox-meta.json`, {
        output_wav: out,
        text_chars: 4,
        device_requested: 'auto',
      });
      return {
        code: 0,
        signal: null,
        stdout: '',
        stderr: '',
        timedOut: false,
      };
    };
    const provider = new ChatterboxVoiceProvider({
      pythonPath: 'python3.11',
      scriptPath: 'synthesize.py',
      ckptDir: '/ckpts',
      refWav: '/ref.wav',
      device: 'auto',
      timeoutMs: CHATTERBOX_DEFAULT_TIMEOUT_MS,
      spawnFn,
    });
    await provider.synthesize('hola', path.join(dir, 'to.wav'));
    expect(seenTimeout).toBe(300_000);
    expect(seenTimeout).not.toBe(DEFAULTS.requestTimeoutMs);
  });
});

describe('chatterbox config loading', () => {
  const original = {...process.env};

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in original)) delete process.env[key];
    }
    Object.assign(process.env, original);
  });

  it('loads chatterbox env without requiring it for other providers', () => {
    delete process.env.VOICE_PROVIDER;
    delete process.env.CHATTERBOX_PYTHON;
    delete process.env.CHATTERBOX_CKPT_DIR;
    delete process.env.CHATTERBOX_REF_WAV;
    const cfg = loadConfig();
    expect(cfg.voiceProvider).not.toBe('chatterbox');
    expect(cfg.chatterboxTimeoutMs).toBe(300_000);
    expect(cfg.chatterboxDevice).toBe('auto');
    expect(cfg.chatterboxScript).toMatch(/tools[/\\]chatterbox[/\\]synthesize\.py$/);
  });

  it('recognizes VOICE_PROVIDER=chatterbox', () => {
    process.env.VOICE_PROVIDER = 'chatterbox';
    process.env.CHATTERBOX_PYTHON = '/venv/bin/python';
    process.env.CHATTERBOX_CKPT_DIR = '/ckpts';
    process.env.CHATTERBOX_REF_WAV = '/ref.wav';
    process.env.CHATTERBOX_DEVICE = 'mps';
    process.env.CHATTERBOX_TIMEOUT_MS = '300000';
    const cfg = loadConfig();
    expect(cfg.voiceProvider).toBe('chatterbox');
    expect(cfg.chatterboxPython).toBe('/venv/bin/python');
    expect(cfg.chatterboxDevice).toBe('mps');
    expect(cfg.chatterboxTimeoutMs).toBe(300_000);
  });
});
