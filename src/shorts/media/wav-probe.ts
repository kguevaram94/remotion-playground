import {readFileSync} from 'node:fs';

/**
 * Structural probe for PCM WAVE files used by VOICE_PROVIDER=file
 * (and as a duration helper for other local WAV readers).
 *
 * Accepts uncompressed PCM (audioFormat=1) only. Handles OpenAI-style
 * data chunk size 0xffffffff by using remaining file bytes, and rejects
 * truncated files whose declared data size exceeds available bytes.
 */

export type WavProbeResult = {
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  audioFormat: number;
  dataBytes: number;
};

export class WavProbeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WavProbeError';
  }
}

const PCM_AUDIO_FORMAT = 1;

const alignChunk = (size: number): number => (size & 1 ? size + 1 : size);

/**
 * Probe a PCM RIFF/WAVE file. Throws WavProbeError on invalid structure,
 * unsupported format, truncation, or unreadable path.
 */
export const probePcmWav = (filePath: string): WavProbeResult => {
  let buf: Buffer;
  try {
    buf = readFileSync(filePath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new WavProbeError(`No se pudo leer WAV (${filePath}): ${message}`);
  }

  if (buf.length < 44) {
    throw new WavProbeError(`WAV demasiado corto (${filePath})`);
  }
  if (buf.toString('ascii', 0, 4) !== 'RIFF') {
    throw new WavProbeError(`No es RIFF (${filePath})`);
  }
  if (buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new WavProbeError(`No es WAVE (${filePath})`);
  }

  let audioFormat = 0;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let foundFmt = false;
  let dataBytes = 0;
  let foundData = false;

  let offset = 12;
  while (offset <= buf.length - 8) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const payload = offset + 8;
    const available = Math.max(0, buf.length - payload);

    if (id === 'fmt ') {
      if (size < 16) {
        throw new WavProbeError(`Chunk fmt demasiado corto (${filePath})`);
      }
      if (available < 16) {
        throw new WavProbeError(`Chunk fmt truncado (${filePath})`);
      }
      audioFormat = buf.readUInt16LE(payload);
      channels = buf.readUInt16LE(payload + 2);
      sampleRate = buf.readUInt32LE(payload + 4);
      bitsPerSample = buf.readUInt16LE(payload + 14);
      foundFmt = true;
    } else if (id === 'data') {
      if (size === 0xffffffff) {
        dataBytes = available;
      } else if (size > available) {
        throw new WavProbeError(
          `Chunk data truncado: declara ${size} bytes, hay ${available} (${filePath})`,
        );
      } else {
        dataBytes = size;
      }
      foundData = true;
      break;
    }

    if (size === 0xffffffff) {
      break;
    }
    const step = 8 + alignChunk(size);
    if (step <= 0 || offset + step <= offset) {
      throw new WavProbeError(`Chunk WAV inválido (${filePath})`);
    }
    offset += step;
  }

  if (!foundFmt) {
    throw new WavProbeError(`WAV sin chunk fmt (${filePath})`);
  }
  if (!foundData) {
    throw new WavProbeError(`WAV sin chunk data (${filePath})`);
  }
  if (audioFormat !== PCM_AUDIO_FORMAT) {
    throw new WavProbeError(
      `WAV no es PCM (audioFormat=${audioFormat}); VOICE_PROVIDER=file requiere PCM (${filePath})`,
    );
  }
  if (channels < 1 || sampleRate <= 0) {
    throw new WavProbeError(
      `WAV fmt inválido (channels=${channels}, rate=${sampleRate}) (${filePath})`,
    );
  }
  if (bitsPerSample < 8 || bitsPerSample % 8 !== 0) {
    throw new WavProbeError(
      `WAV bitsPerSample no soportado (${bitsPerSample}) (${filePath})`,
    );
  }

  const bytesPerFrame = (bitsPerSample / 8) * channels;
  if (bytesPerFrame <= 0 || dataBytes <= 0) {
    throw new WavProbeError(`WAV sin muestras de audio (${filePath})`);
  }
  if (dataBytes % bytesPerFrame !== 0) {
    throw new WavProbeError(
      `WAV data no alineado a frame (${dataBytes} bytes, frame=${bytesPerFrame}) (${filePath})`,
    );
  }

  const durationSeconds = dataBytes / bytesPerFrame / sampleRate;
  if (!(durationSeconds > 0) || !Number.isFinite(durationSeconds)) {
    throw new WavProbeError(`Duración WAV inválida (${filePath})`);
  }

  return {
    durationSeconds,
    sampleRate,
    channels,
    bitsPerSample,
    audioFormat,
    dataBytes,
  };
};

/** Soft reader for callers that keep an estimate fallback (e.g. macos-say). */
export const readWavDurationSeconds = (filePath: string): number | null => {
  try {
    return probePcmWav(filePath).durationSeconds;
  } catch {
    return null;
  }
};
