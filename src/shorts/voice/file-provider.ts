import {copyFileSync, existsSync, mkdirSync, statSync} from 'node:fs';
import path from 'node:path';
import {estimateNarrationSeconds} from '../utils/timing';
import type {VoiceResult} from './provider';

/**
 * Use a pre-recorded WAV/AIFF/MP3 as narration (your real voice).
 * Looks for, in order:
 * 1) explicit VOICE_FILE
 * 2) output/<jobId>/narration.custom.wav
 * 3) data/voices/custom.wav
 */
export const resolveCustomNarrationPath = (
  jobId: string,
  voiceFile?: string,
): string | null => {
  const candidates = [
    voiceFile,
    path.join(process.cwd(), 'output', jobId, 'narration.custom.wav'),
    path.join(process.cwd(), 'output', jobId, 'narration.custom.mp3'),
    path.join(process.cwd(), 'data', 'voices', 'custom.wav'),
  ].filter(Boolean) as string[];

  for (const file of candidates) {
    const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    if (existsSync(abs) && statSync(abs).size > 1000) return abs;
  }
  return null;
};

export const synthesizeFromFile = (
  text: string,
  outputPath: string,
  sourcePath: string,
): VoiceResult => {
  mkdirSync(path.dirname(outputPath), {recursive: true});
  copyFileSync(sourcePath, outputPath);
  const durationSeconds = estimateNarrationSeconds(text);
  const words = text.split(/\s+/).filter(Boolean);
  const msEach = (durationSeconds * 1000) / Math.max(1, words.length);
  let cursor = 0;
  const cues = words.map((w) => {
    const startMs = cursor;
    const endMs = cursor + msEach;
    cursor = endMs;
    return {text: w, startMs, endMs};
  });

  return {
    audioPath: outputPath,
    durationSeconds,
    sampleRate: 44100,
    format: path.extname(outputPath).slice(1) || 'wav',
    provider: 'file',
    model: path.basename(sourcePath),
    isTestAudio: false,
    cues,
  };
};
