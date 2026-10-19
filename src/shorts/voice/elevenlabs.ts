import {writeFileSync, mkdirSync, readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {estimateNarrationSeconds} from '../utils/timing';
import type {VoiceResult} from './provider';

/**
 * ElevenLabs — natural TTS + optional instant voice clone from a sample of you.
 * Docs: https://elevenlabs.io/docs
 */
export type ElevenLabsOptions = {
  apiKey: string;
  voiceId: string;
  modelId?: string;
  timeoutMs: number;
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

export const synthesizeElevenLabs = async (
  text: string,
  outputPath: string,
  options: ElevenLabsOptions,
): Promise<VoiceResult> => {
  const modelId = options.modelId || 'eleven_multilingual_v2';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  mkdirSync(path.dirname(outputPath), {recursive: true});

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${options.voiceId}?output_format=wav_44100`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': options.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/wav',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `ElevenLabs HTTP ${response.status}: ${errText.slice(0, 400)}`,
      );
    }

    const buf = Buffer.from(await response.arrayBuffer());
    writeFileSync(outputPath, buf);
    const durationSeconds = estimateNarrationSeconds(text);

    return {
      audioPath: outputPath,
      durationSeconds,
      sampleRate: 44100,
      format: 'wav',
      provider: 'elevenlabs',
      model: `${modelId}/${options.voiceId}`,
      isTestAudio: false,
      cues: buildWordCues(text, durationSeconds),
    };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Instant Voice Clone: upload a short sample of your voice (30s–2min clean speech).
 * Returns voice_id to set as ELEVENLABS_VOICE_ID.
 */
export const cloneVoiceElevenLabs = async (options: {
  apiKey: string;
  name: string;
  samplePath: string;
  timeoutMs: number;
}): Promise<{voiceId: string}> => {
  if (!existsSync(options.samplePath)) {
    throw new Error(`No existe la muestra de voz: ${options.samplePath}`);
  }

  const form = new FormData();
  form.append('name', options.name);
  form.append('description', 'Clon para Shorts Remotion');
  const blob = new Blob([readFileSync(options.samplePath)], {
    type: 'audio/wav',
  });
  form.append('files', blob, path.basename(options.samplePath));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {'xi-api-key': options.apiKey},
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `ElevenLabs clone HTTP ${response.status}: ${errText.slice(0, 400)}`,
      );
    }
    const json = (await response.json()) as {voice_id?: string};
    if (!json.voice_id) throw new Error('ElevenLabs no devolvió voice_id');
    return {voiceId: json.voice_id};
  } finally {
    clearTimeout(timer);
  }
};
