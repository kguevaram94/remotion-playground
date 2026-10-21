import {createHash} from 'node:crypto';
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  copyFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {
  buildChatterboxCacheModelIdentity,
  CHATTERBOX_CACHE_IDENTITY_VERSION,
  formatCacheNumber,
  loadDeclaredRuntimePinFingerprint,
  parseRequirementsPinText,
  resolveChatterboxPinFilePath,
  serializeDeclaredRuntimePin,
  sha256FileContent,
} from '../../src/shorts/voice/chatterbox-cache';
import {CHATTERBOX_MODEL_ID} from '../../src/shorts/voice/chatterbox';
import {narrationCacheKey} from '../../src/shorts/voice/provider';

const PIN_FIXTURE = `# Pilot-verified pins (test fixture).
# Python interpreter: 3.11.17
# noise comment
torch==2.6.0
torchaudio==2.6.0
chatterbox-tts==0.1.7
`;

describe('chatterbox cache identity (phase 2B)', () => {
  let dir: string;
  let pinPath: string;
  let refA: string;
  let refBSameBytes: string;
  let refDifferent: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'cbx-cache-'));
    pinPath = path.join(dir, 'requirements-pin.txt');
    writeFileSync(pinPath, PIN_FIXTURE, 'utf8');

    refA = path.join(dir, 'ref-a.wav');
    refBSameBytes = path.join(dir, 'subdir', 'ref-b-copy.wav');
    refDifferent = path.join(dir, 'ref-different.wav');
    mkdirSync(path.dirname(refBSameBytes), {recursive: true});

    const bytesA = Buffer.from('synthetic-ref-wav-bytes-v1');
    writeFileSync(refA, bytesA);
    copyFileSync(refA, refBSameBytes);
    writeFileSync(refDifferent, Buffer.from('synthetic-ref-wav-bytes-v2'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('hashes reference content identically for the same bytes', async () => {
    const a = await sha256FileContent(refA);
    const b = await sha256FileContent(refA);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('same bytes at different paths share content identity', async () => {
    const a = await sha256FileContent(refA);
    const b = await sha256FileContent(refBSameBytes);
    expect(a).toBe(b);
    expect(path.resolve(refA)).not.toBe(path.resolve(refBSameBytes));
  });

  it('changing reference bytes changes the hash and cache key', async () => {
    const base = {
      pinFilePath: pinPath,
      device: 'auto' as const,
      languageId: 'es',
      exaggeration: 0.5,
      cfgWeight: 0.5,
      temperature: 0.8,
    };
    const idA = await buildChatterboxCacheModelIdentity({
      ...base,
      refWavPath: refA,
    });
    const idB = await buildChatterboxCacheModelIdentity({
      ...base,
      refWavPath: refDifferent,
    });
    expect(idA).not.toBe(idB);
    expect(idA).toContain('refSha256=');
    expect(idB).toContain('refSha256=');

    const text = 'hola|pauses:0';
    expect(narrationCacheKey(text, 'chatterbox', idA)).not.toBe(
      narrationCacheKey(text, 'chatterbox', idB),
    );
  });

  it('identical ref bytes at different paths yield the same cache model identity', async () => {
    const base = {
      pinFilePath: pinPath,
      device: 'mps',
      languageId: 'es',
      exaggeration: 0.4,
      cfgWeight: 0.6,
      temperature: 0.7,
    };
    const idA = await buildChatterboxCacheModelIdentity({
      ...base,
      refWavPath: refA,
    });
    const idB = await buildChatterboxCacheModelIdentity({
      ...base,
      refWavPath: refBSameBytes,
    });
    expect(idA).toBe(idB);
  });

  it('runtime pin fingerprint change invalidates the Chatterbox cache key', async () => {
    const base = {
      refWavPath: refA,
      device: 'auto',
      languageId: 'es',
      exaggeration: 0.5,
      cfgWeight: 0.5,
      temperature: 0.8,
    };
    const idBefore = await buildChatterboxCacheModelIdentity({
      ...base,
      pinFilePath: pinPath,
    });

    writeFileSync(
      pinPath,
      PIN_FIXTURE.replace('chatterbox-tts==0.1.7', 'chatterbox-tts==0.1.8'),
      'utf8',
    );
    const idAfter = await buildChatterboxCacheModelIdentity({
      ...base,
      pinFilePath: pinPath,
    });
    expect(idBefore).not.toBe(idAfter);

    const text = 'texto|pauses:0.2,0';
    expect(narrationCacheKey(text, 'chatterbox', idBefore)).not.toBe(
      narrationCacheKey(text, 'chatterbox', idAfter),
    );
  });

  it('synthesis parameter changes alter the cache model identity', async () => {
    const base = {
      refWavPath: refA,
      pinFilePath: pinPath,
      device: 'auto',
      languageId: 'es',
      exaggeration: 0.5,
      cfgWeight: 0.5,
      temperature: 0.8,
    };
    const a = await buildChatterboxCacheModelIdentity(base);
    const b = await buildChatterboxCacheModelIdentity({
      ...base,
      exaggeration: 0.9,
    });
    const c = await buildChatterboxCacheModelIdentity({
      ...base,
      device: 'cpu',
    });
    const d = await buildChatterboxCacheModelIdentity({
      ...base,
      languageId: 'en',
    });
    expect(new Set([a, b, c, d]).size).toBe(4);
  });

  it('missing reference throws and does not invent a cache identity', async () => {
    await expect(
      buildChatterboxCacheModelIdentity({
        refWavPath: path.join(dir, 'missing.wav'),
        pinFilePath: pinPath,
        device: 'auto',
        languageId: 'es',
        exaggeration: 0.5,
        cfgWeight: 0.5,
        temperature: 0.8,
      }),
    ).rejects.toThrow(/no se puede leer la referencia vocal/);
  });

  it('missing or empty pin file is an explicit failure (no silent runtime)', () => {
    expect(() =>
      loadDeclaredRuntimePinFingerprint(path.join(dir, 'no-pins.txt')),
    ).toThrow(/falta el archivo de pins declarados/);

    const emptyPins = path.join(dir, 'empty-pins.txt');
    writeFileSync(emptyPins, '# only comments\n', 'utf8');
    expect(() => loadDeclaredRuntimePinFingerprint(emptyPins)).toThrow(
      /no contiene pins package==version/,
    );
  });

  it('rejects malformed pin lines instead of ignoring them', () => {
    expect(() =>
      parseRequirementsPinText('torch==2.6.0\nnot-a-pin\n'),
    ).toThrow(/línea de pin malformada/);
    expect(() =>
      parseRequirementsPinText('torch>=2.6.0\n'),
    ).toThrow(/línea de pin malformada/);
    expect(() =>
      parseRequirementsPinText('torch\n'),
    ).toThrow(/línea de pin malformada/);
  });

  it('rejects duplicate packages even with the same version', () => {
    expect(() =>
      parseRequirementsPinText('torch==2.6.0\ntorch==2.6.0\n'),
    ).toThrow(/paquete duplicado.*torch/);
    expect(() =>
      parseRequirementsPinText('torch==2.6.0\ntorch==2.7.0\n'),
    ).toThrow(/paquete duplicado.*torch/);
  });

  it('fails fingerprint when valid pins are mixed with invalid lines', () => {
    const mixed = path.join(dir, 'mixed-pins.txt');
    writeFileSync(
      mixed,
      `# Python interpreter: 3.11.17
torch==2.6.0
bad-line-without-version
chatterbox-tts==0.1.7
`,
      'utf8',
    );
    expect(() => loadDeclaredRuntimePinFingerprint(mixed)).toThrow(
      /línea de pin malformada/,
    );
  });

  it('still ignores blank lines and non-interpreter comments', () => {
    const pin = parseRequirementsPinText(`# noise

# Python interpreter: 3.11.17
torch==2.6.0

# trailing comment
`);
    expect(pin).toEqual({
      python: '3.11.17',
      packages: {torch: '2.6.0'},
    });
  });

  it('serializes declared pins deterministically (order-independent input)', () => {
    const shuffled = `# Python interpreter: 3.11.17
chatterbox-tts==0.1.7
torch==2.6.0
torchaudio==2.6.0
`;
    const ordered = `# Python interpreter: 3.11.17
torch==2.6.0
torchaudio==2.6.0
chatterbox-tts==0.1.7
`;
    const a = serializeDeclaredRuntimePin(parseRequirementsPinText(shuffled));
    const b = serializeDeclaredRuntimePin(parseRequirementsPinText(ordered));
    expect(a).toBe(b);
    expect(a).toBe(
      JSON.stringify({
        python: '3.11.17',
        packages: {
          'chatterbox-tts': '0.1.7',
          torch: '2.6.0',
          torchaudio: '2.6.0',
        },
      }),
    );
    const fp = createHash('sha256').update(a, 'utf8').digest('hex');
    const loaded = loadDeclaredRuntimePinFingerprint(pinPath);
    expect(loaded.fingerprintSha256).toBe(fp);
    expect(loaded.canonical).toBe(a);
  });

  it('model identity serialization is stable across repeated builds', async () => {
    const input = {
      refWavPath: refA,
      pinFilePath: pinPath,
      device: 'auto',
      languageId: 'es',
      exaggeration: 0.5,
      cfgWeight: 0.5,
      temperature: 0.8,
    };
    const a = await buildChatterboxCacheModelIdentity(input);
    const b = await buildChatterboxCacheModelIdentity(input);
    expect(a).toBe(b);
    expect(a.startsWith(`${CHATTERBOX_CACHE_IDENTITY_VERSION}|`)).toBe(true);
    expect(a).toContain(`modelId=${CHATTERBOX_MODEL_ID}`);
    expect(a).toContain(`exag=${formatCacheNumber(0.5)}`);
  });

  it('resolveChatterboxPinFilePath stays next to the CLI script', () => {
    const script = path.join(dir, 'tools', 'chatterbox', 'synthesize.py');
    expect(resolveChatterboxPinFilePath(script)).toBe(
      path.join(dir, 'tools', 'chatterbox', 'requirements-pin.txt'),
    );
  });

  it('non-chatterbox narrationCacheKey shape stays compatible', () => {
    const text = 'hola mundo|pauses:0';
    const legacyModel = [
      'Monica',
      undefined,
      undefined,
      'speed:1.2',
      undefined,
      undefined,
      undefined,
    ]
      .filter(Boolean)
      .join('|');
    const key1 = narrationCacheKey(text, 'macos-say', legacyModel);
    const key2 = narrationCacheKey(text, 'macos-say', legacyModel);
    expect(key1).toBe(key2);
    expect(key1).toMatch(/^[a-f0-9]{64}$/);
    // Different provider must not collide with chatterbox even if model string matched.
    expect(narrationCacheKey(text, 'chatterbox', legacyModel)).not.toBe(key1);
  });
});
