import {createHash} from 'node:crypto';
import {createReadStream, existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {CHATTERBOX_MODEL_ID, safePathLabel} from './chatterbox';

/**
 * Cache-identity helpers for Chatterbox (T-CHATTERBOX-002 · phase 2B).
 *
 * Scope: distinguish narration cache entries when the voice reference bytes
 * or the *declared* runtime pin set change. This does **not**:
 * - prove the final WAV came from that reference (only identifies ref content);
 * - prove installed Python packages match the pin file (declared pins only);
 * - close phase-1 reservations or assert `verified_provenance`.
 */

/** Bump when the Chatterbox-only model-identity serialization changes. */
export const CHATTERBOX_CACHE_IDENTITY_VERSION = '2b';

export const DEFAULT_CHATTERBOX_PIN_FILENAME = 'requirements-pin.txt';

const PIN_PACKAGE_RE = /^([A-Za-z0-9_.-]+)==([A-Za-z0-9_.+-]+)\s*$/;
const PIN_PYTHON_RE = /^#\s*Python interpreter:\s*(\S+)\s*$/i;

export type DeclaredRuntimePin = {
  /** Documented interpreter pin from the pin file comment, if present. */
  python?: string;
  /** package → version from `name==version` lines (sorted at serialize time). */
  packages: Record<string, string>;
};

export type ChatterboxCacheIdentityInput = {
  refWavPath: string;
  /** Absolute or cwd-relative path to `requirements-pin.txt`. */
  pinFilePath: string;
  modelId?: string;
  device: string;
  languageId: string;
  exaggeration: number;
  cfgWeight: number;
  temperature: number;
};

/**
 * Resolve the declared pin file next to the CLI script (no absolute home paths baked in).
 */
export const resolveChatterboxPinFilePath = (scriptPath: string): string => {
  const dir = path.dirname(path.resolve(scriptPath));
  return path.join(dir, DEFAULT_CHATTERBOX_PIN_FILENAME);
};

/** Stable decimal formatting for synthesis params in the cache identity string. */
export const formatCacheNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    throw new Error(
      `Chatterbox cache identity: parámetro numérico no finito (${value})`,
    );
  }
  return value.toFixed(6);
};

/**
 * SHA-256 of file bytes via chunked streaming (does not load the whole file).
 * Hashes content only — not path, name, or mtime.
 */
export const sha256FileContent = async (filePath: string): Promise<string> => {
  if (!existsSync(filePath)) {
    throw new Error(
      `Chatterbox cache identity: no se puede leer la referencia vocal (${safePathLabel(filePath)})`,
    );
  }
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => {
      hash.update(chunk);
    });
    stream.on('error', (err) => {
      reject(
        new Error(
          `Chatterbox cache identity: error al hashear (${safePathLabel(filePath)}): ${err.message}`,
        ),
      );
    });
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
  });
};

/**
 * Parse `requirements-pin.txt` into a declared pin set.
 * Comments (except the Python interpreter line) and blank lines are ignored.
 * Package lines are `name==version` only — no paths or timestamps.
 */
export const parseRequirementsPinText = (raw: string): DeclaredRuntimePin => {
  const packages: Record<string, string> = {};
  let python: string | undefined;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const py = trimmed.match(PIN_PYTHON_RE);
    if (py) {
      python = py[1];
      continue;
    }
    if (trimmed.startsWith('#')) continue;
    const pkg = trimmed.match(PIN_PACKAGE_RE);
    if (pkg) {
      packages[pkg[1]!] = pkg[2]!;
    }
  }
  return python ? {python, packages} : {packages};
};

/** Canonical UTF-8 payload for hashing declared pins (sorted package keys). */
export const serializeDeclaredRuntimePin = (pin: DeclaredRuntimePin): string => {
  const packageNames = Object.keys(pin.packages).sort();
  const packages: Record<string, string> = {};
  for (const name of packageNames) {
    packages[name] = pin.packages[name]!;
  }
  // Fixed key order: python (optional) then packages — independent of input line order.
  const body: {python?: string; packages: Record<string, string>} =
    pin.python !== undefined
      ? {python: pin.python, packages}
      : {packages};
  return JSON.stringify(body);
};

/**
 * Fingerprint of the *declared* pin file next to the CLI.
 * Does **not** inspect the live venv or run Python — installed packages may differ.
 */
export const loadDeclaredRuntimePinFingerprint = (
  pinFilePath: string,
): {fingerprintSha256: string; pin: DeclaredRuntimePin; canonical: string} => {
  if (!existsSync(pinFilePath)) {
    throw new Error(
      `Chatterbox cache identity: falta el archivo de pins declarados (${safePathLabel(pinFilePath)}). ` +
        'Sin pins verificables en repo no se puede construir la clave de caché.',
    );
  }
  let raw: string;
  try {
    raw = readFileSync(pinFilePath, 'utf8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Chatterbox cache identity: no se pudo leer pins (${safePathLabel(pinFilePath)}): ${message}`,
    );
  }
  const pin = parseRequirementsPinText(raw);
  if (Object.keys(pin.packages).length === 0) {
    throw new Error(
      `Chatterbox cache identity: ${safePathLabel(pinFilePath)} no contiene pins package==version`,
    );
  }
  const canonical = serializeDeclaredRuntimePin(pin);
  const fingerprintSha256 = createHash('sha256')
    .update(canonical, 'utf8')
    .digest('hex');
  return {fingerprintSha256, pin, canonical};
};

/**
 * Deterministic Chatterbox-only `model` argument for `narrationCacheKey`.
 * Throws if the reference cannot be hashed or declared pins are unavailable —
 * never returns a weaker identity that would allow silent unsafe cache reuse.
 */
export const buildChatterboxCacheModelIdentity = async (
  input: ChatterboxCacheIdentityInput,
): Promise<string> => {
  const refSha256 = await sha256FileContent(input.refWavPath);
  const {fingerprintSha256} = loadDeclaredRuntimePinFingerprint(
    input.pinFilePath,
  );
  const modelId = input.modelId ?? CHATTERBOX_MODEL_ID;
  // Fixed field order — do not reorder without bumping CHATTERBOX_CACHE_IDENTITY_VERSION.
  return [
    CHATTERBOX_CACHE_IDENTITY_VERSION,
    `modelId=${modelId}`,
    `refSha256=${refSha256}`,
    `runtimePinSha256=${fingerprintSha256}`,
    `device=${input.device}`,
    `lang=${input.languageId}`,
    `exag=${formatCacheNumber(input.exaggeration)}`,
    `cfg=${formatCacheNumber(input.cfgWeight)}`,
    `temp=${formatCacheNumber(input.temperature)}`,
  ].join('|');
};
