import {createHash} from 'node:crypto';
import {existsSync, readFileSync, unlinkSync} from 'node:fs';
import path from 'node:path';
import {loudnormAudio} from './ffmpeg';

export type NarrationRenderKind = 'loudnorm' | 'raw' | 'mock';

export type NarrationRenderProvenance = {
  /** Absolute path of the file whose bytes were published to Remotion. */
  sourcePath: string;
  kind: NarrationRenderKind;
  /** Full SHA-1 of published bytes (public filename uses the first 12 hex chars). */
  sha1: string;
  publicFile: string;
  /** ISO timestamp recorded immediately before renderMedia. */
  recordedAt: string;
};

export type NarrationLoudnormQcStatus =
  | 'verified_provenance'
  | 'mock_omitted'
  | 'unverified'
  | 'failed';

export type NarrationLoudnormQcResult = {
  ok: boolean;
  status: NarrationLoudnormQcStatus;
  detail: string;
  warning?: string;
};

export const sha1File = (filePath: string): string => {
  const buf = readFileSync(filePath);
  return createHash('sha1').update(buf).digest('hex');
};

/**
 * Ensure a loudnorm copy of narration exists for non-mock audio.
 * Returns the path to use in the Remotion render (loudnorm when available).
 */
export const ensureNarrationLoudnorm = (options: {
  jobDir: string;
  narrationAudio: string;
  isTestAudio: boolean;
}): {usedPath: string; loudnormPath: string | null; applied: boolean} => {
  const {jobDir, narrationAudio, isTestAudio} = options;
  if (!existsSync(narrationAudio)) {
    return {usedPath: narrationAudio, loudnormPath: null, applied: false};
  }

  if (isTestAudio) {
    const stale = path.join(jobDir, 'narration-loudnorm.wav');
    if (existsSync(stale)) {
      try {
        unlinkSync(stale);
      } catch {
        // ignore
      }
    }
    return {usedPath: narrationAudio, loudnormPath: null, applied: false};
  }

  const loudnormPath = path.join(jobDir, 'narration-loudnorm.wav');
  if (loudnormAudio(narrationAudio, loudnormPath) && existsSync(loudnormPath)) {
    return {usedPath: loudnormPath, loudnormPath, applied: true};
  }

  return {usedPath: narrationAudio, loudnormPath: null, applied: false};
};

/** Prefer loudnorm WAV for render when present and not test audio. */
export const resolveNarrationForRender = (options: {
  narrationAudio?: string;
  narrationLoudnorm?: string;
  isTestAudio: boolean;
}): string | null => {
  return selectNarrationSourceForRender(options).path;
};

/**
 * Resolve which narration file would be published for Remotion and why.
 * Used by render (selection) and tests — not by QC alone (QC needs provenance).
 */
export const selectNarrationSourceForRender = (options: {
  narrationAudio?: string;
  narrationLoudnorm?: string;
  isTestAudio: boolean;
}): {path: string | null; kind: NarrationRenderKind | null} => {
  const {narrationAudio, narrationLoudnorm, isTestAudio} = options;
  if (isTestAudio) {
    if (narrationAudio && existsSync(narrationAudio)) {
      return {path: narrationAudio, kind: 'mock'};
    }
    return {path: null, kind: null};
  }
  if (narrationLoudnorm && existsSync(narrationLoudnorm)) {
    return {path: narrationLoudnorm, kind: 'loudnorm'};
  }
  if (narrationAudio && existsSync(narrationAudio)) {
    return {path: narrationAudio, kind: 'raw'};
  }
  return {path: null, kind: null};
};

/**
 * QC for narration loudnorm: require render-time provenance.
 * Existence of narration-loudnorm.wav alone is insufficient (post_process
 * used to create it after the MP4 was already baked).
 *
 * A passing check means provenance shows loudnorm bytes were published to
 * Remotion — it does NOT claim the MP4 container was re-extracted/verified.
 */
export const evaluateNarrationLoudnormQc = (options: {
  audioIsTest: boolean;
  provenance?: NarrationRenderProvenance | null;
  narrationLoudnorm?: string;
  narrationAudio?: string;
}): NarrationLoudnormQcResult => {
  const {audioIsTest, provenance, narrationLoudnorm, narrationAudio} = options;

  if (audioIsTest) {
    return {
      ok: true,
      status: 'mock_omitted',
      detail: 'omitido (mock)',
    };
  }

  if (!provenance) {
    return {
      ok: false,
      status: 'unverified',
      detail:
        'sin provenance de render; no se puede demostrar uso de loudnorm en el MP4',
      warning:
        'Narración loudnorm no verificada: falta provenance de audio publicado en el render',
    };
  }

  const loudnormExists = Boolean(
    narrationLoudnorm && existsSync(narrationLoudnorm),
  );

  if (provenance.kind !== 'loudnorm') {
    const postHoc =
      loudnormExists &&
      narrationLoudnorm !== provenance.sourcePath &&
      (!narrationAudio || provenance.sourcePath === narrationAudio);

    return {
      ok: false,
      status: postHoc ? 'failed' : 'failed',
      detail: postHoc
        ? 'narration-loudnorm.wav existe pero el render publicó narration.wav (generación post-render no cuenta)'
        : `render publicó audio kind=${provenance.kind}; no loudnorm`,
      warning: postHoc
        ? 'Narración loudnorm generada después del render: el MP4 no se valida como normalizado'
        : 'Narración loudnorm ausente o no seleccionada en el render',
    };
  }

  if (loudnormExists && narrationLoudnorm) {
    try {
      const currentSha1 = sha1File(narrationLoudnorm);
      if (currentSha1 !== provenance.sha1) {
        return {
          ok: false,
          status: 'unverified',
          detail:
            'provenance loudnorm no coincide con el WAV actual (contenido distinto)',
          warning:
            'El sha1 del WAV loudnorm no coincide con el audio publicado en el render',
        };
      }
    } catch {
      return {
        ok: false,
        status: 'unverified',
        detail: 'no se pudo leer el WAV loudnorm para contrastar provenance',
        warning: 'No se pudo verificar el sha1 del audio loudnorm',
      };
    }
  }

  return {
    ok: true,
    status: 'verified_provenance',
    detail: `provenance: loudnorm publicado sha1=${provenance.sha1.slice(0, 12)}; contenido del MP4 no re-extraído`,
  };
};
