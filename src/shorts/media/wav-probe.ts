import {readFileSync} from 'node:fs';

/**
 * Structural probe for PCM WAVE files used by VOICE_PROVIDER=file
 * (and as a duration helper for other local WAV readers).
 *
 * Accepts uncompressed PCM (audioFormat=1) only.
 *
 * Special size 0xffffffff (OpenAI / streaming sentinel):
 * - Never treated as a literal >4 GiB length.
 * - For `data`: only bytes demonstrably present in the file are used, then
 *   floored to complete PCM frames; leftover trailing bytes are ignored.
 * - For any other chunk: scanning stops (cannot safely skip an unknown span).
 * - If no complete PCM frame remains, the file is rejected.
 *
 * Truncated chunks (declared size > available payload bytes) are rejected.
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
/** RIFF/WAVE streaming / unknown-length sentinel (not a literal byte count). */
const RIFF_SIZE_UNKNOWN = 0xffffffff;

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
  let blockAlign = 0;
  let avgBytesPerSec = 0;
  let foundFmt = false;
  let dataBytes = 0;
  let foundData = false;
  /** True when data chunk used the 0xffffffff sentinel (EOF / unknown length). */
  let dataSizeUnknown = false;

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
      // Declared fmt payload must fit in the file — do not read past EOF.
      if (size > available) {
        throw new WavProbeError(
          `Chunk fmt truncado: declara ${size} bytes, hay ${available} (${filePath})`,
        );
      }
      audioFormat = buf.readUInt16LE(payload);
      channels = buf.readUInt16LE(payload + 2);
      sampleRate = buf.readUInt32LE(payload + 4);
      avgBytesPerSec = buf.readUInt32LE(payload + 8);
      blockAlign = buf.readUInt16LE(payload + 12);
      bitsPerSample = buf.readUInt16LE(payload + 14);
      foundFmt = true;
    } else if (id === 'data') {
      if (size === RIFF_SIZE_UNKNOWN) {
        // Sentinel: limit to bytes present; frame flooring happens after fmt checks.
        dataBytes = available;
        dataSizeUnknown = true;
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

    if (size === RIFF_SIZE_UNKNOWN) {
      // Cannot skip an unknown-length non-data chunk without leaving the buffer.
      break;
    }
    if (size > available) {
      throw new WavProbeError(
        `Chunk ${id.trim()} truncado: declara ${size} bytes, hay ${available} (${filePath})`,
      );
    }
    const step = 8 + alignChunk(size);
    if (step <= 0 || offset + step <= offset) {
      throw new WavProbeError(`Chunk WAV inválido (${filePath})`);
    }
    // Padding byte (odd sizes) must exist when another chunk may follow.
    if (size & 1) {
      const padOffset = payload + size;
      if (padOffset >= buf.length) {
        throw new WavProbeError(
          `Chunk ${id.trim()} sin byte de padding RIFF (${filePath})`,
        );
      }
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

  const bytesPerSample = bitsPerSample / 8;
  const expectedBlockAlign = channels * bytesPerSample;
  const expectedAvgBytesPerSec = sampleRate * expectedBlockAlign;
  if (blockAlign !== expectedBlockAlign) {
    throw new WavProbeError(
      `WAV nBlockAlign incoherente (tiene ${blockAlign}, esperado ${expectedBlockAlign}) (${filePath})`,
    );
  }
  if (avgBytesPerSec !== expectedAvgBytesPerSec) {
    throw new WavProbeError(
      `WAV nAvgBytesPerSec incoherente (tiene ${avgBytesPerSec}, esperado ${expectedAvgBytesPerSec}) (${filePath})`,
    );
  }

  const bytesPerFrame = expectedBlockAlign;
  if (bytesPerFrame <= 0) {
    throw new WavProbeError(`WAV sin muestras de audio (${filePath})`);
  }

  if (dataSizeUnknown) {
    // Use only complete PCM frames from the demonstrable suffix.
    const complete = dataBytes - (dataBytes % bytesPerFrame);
    if (complete <= 0) {
      throw new WavProbeError(`WAV sin muestras de audio (${filePath})`);
    }
    dataBytes = complete;
  } else if (dataBytes <= 0) {
    throw new WavProbeError(`WAV sin muestras de audio (${filePath})`);
  } else if (dataBytes % bytesPerFrame !== 0) {
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
