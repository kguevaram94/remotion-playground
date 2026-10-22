import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import {probePcmWav, WavProbeError} from '../media/wav-probe';
import type {VoiceResult} from './provider';

/**
 * Use a pre-recorded PCM WAV as narration (your real voice).
 * Looks for, in order:
 * 1) explicit VOICE_FILE
 * 2) output/<jobId>/narration.custom.wav
 * 3) data/voices/custom.wav
 *
 * Only uncompressed PCM RIFF/WAVE is accepted. MP3/AIFF must be converted
 * to PCM WAV before use (see docs/voice.md).
 */
export const resolveCustomNarrationPath = (
  jobId: string,
  voiceFile?: string,
): string | null => {
  const candidates = [
    voiceFile,
    path.join(process.cwd(), 'output', jobId, 'narration.custom.wav'),
    path.join(process.cwd(), 'data', 'voices', 'custom.wav'),
  ].filter(Boolean) as string[];

  for (const file of candidates) {
    const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    if (existsSync(abs) && statSync(abs).size > 1000) return abs;
  }
  return null;
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

const assertSameAudio = (
  sourcePath: string,
  outputPath: string,
  sourceProbe: ReturnType<typeof probePcmWav>,
): ReturnType<typeof probePcmWav> => {
  const sourceStat = statSync(sourcePath);
  const outputStat = statSync(outputPath);
  if (sourceStat.size !== outputStat.size) {
    throw new WavProbeError(
      `VOICE_PROVIDER=file: la copia no coincide en tamaño (${sourcePath} → ${outputPath})`,
    );
  }

  const outProbe = probePcmWav(outputPath);
  if (
    outProbe.sampleRate !== sourceProbe.sampleRate ||
    outProbe.channels !== sourceProbe.channels ||
    outProbe.bitsPerSample !== sourceProbe.bitsPerSample ||
    outProbe.dataBytes !== sourceProbe.dataBytes ||
    Math.abs(outProbe.durationSeconds - sourceProbe.durationSeconds) > 1e-9
  ) {
    throw new WavProbeError(
      `VOICE_PROVIDER=file: metadatos de la copia no coinciden con la fuente (${outputPath})`,
    );
  }

  // Byte-identical check (source left intact; copy is a full duplicate).
  const sourceBuf = readFileSync(sourcePath);
  const outputBuf = readFileSync(outputPath);
  if (!sourceBuf.equals(outputBuf)) {
    throw new WavProbeError(
      `VOICE_PROVIDER=file: bytes de la copia difieren de la fuente (${outputPath})`,
    );
  }

  return outProbe;
};

/**
 * Copy a validated PCM WAV into the job narration path.
 * Duration and sampleRate come from the file bytes — never from text estimates.
 */
export const synthesizeFromFile = (
  text: string,
  outputPath: string,
  sourcePath: string,
): VoiceResult => {
  const sourceProbe = probePcmWav(sourcePath);

  mkdirSync(path.dirname(outputPath), {recursive: true});
  copyFileSync(sourcePath, outputPath);

  const outProbe = assertSameAudio(sourcePath, outputPath, sourceProbe);

  return {
    audioPath: outputPath,
    durationSeconds: outProbe.durationSeconds,
    sampleRate: outProbe.sampleRate,
    format: 'wav',
    provider: 'file',
    model: path.basename(sourcePath),
    isTestAudio: false,
    cues: buildWordCues(text, outProbe.durationSeconds),
  };
};
