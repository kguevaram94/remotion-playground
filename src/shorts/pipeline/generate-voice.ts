import {existsSync, mkdirSync, unlinkSync} from 'node:fs';
import path from 'node:path';
import type {AppConfig} from '../config/env';
import {ensureNarrationLoudnorm} from '../media/narration-loudnorm';
import {clearPublishedNarration} from '../media/public-audio';
import {
  concatWavFiles,
  makeSilenceWav,
} from '../media/wav-concat';
import {
  createVoiceProvider,
  narrationCacheKey,
} from '../voice/provider';
import {
  buildNarrationSegments,
  joinNarrationPlain,
} from '../voice/narration-segments';
import type {JobRecord, JobStore} from '../storage/job-store';

export const runGenerateVoice = async (
  store: JobStore,
  job: JobRecord,
  config: AppConfig,
  options?: {force?: boolean},
): Promise<JobRecord> => {
  store.setPhase(job, 'generating_voice', {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  store.save(job);

  try {
    const script = store.readScript(job.id);
    if (!script) throw new Error('No hay script.json');

    const segments = buildNarrationSegments(script.scenes);
    const text = joinNarrationPlain(script.scenes);
    const cacheKey = narrationCacheKey(
      `${text}|pauses:${segments.map((s) => s.pauseAfterSec).join(',')}`,
      config.voiceProvider,
      [
        config.voiceModel,
        config.voiceName,
        config.voiceTtsModel,
        `speed:${config.voiceSpeed}`,
        config.voiceInstructions?.slice(0, 200),
        config.elevenLabsVoiceId,
        config.voiceFile,
      ]
        .filter(Boolean)
        .join('|'),
    );
    const audioPath = path.join(store.jobDir(job.id), 'narration.wav');

    process.stdout.write(
      `[shorts] Voz: provider=${config.voiceProvider}` +
        ` model=${config.voiceModel}` +
        (config.voiceName ? ` name=${config.voiceName}` : '') +
        ` segments=${segments.length}` +
        `\n`,
    );

    if (
      !options?.force &&
      job.hashes.narrationText === cacheKey &&
      job.artifacts.narrationAudio &&
      existsSync(job.artifacts.narrationAudio)
    ) {
      job.warnings.push(
        `Reutilizando narración en caché (${config.voiceModel})`,
      );
      applyLoudnormArtifact(store, job);
      store.setPhase(job, 'generating_voice', {
        status: 'done',
        finishedAt: new Date().toISOString(),
      });
      store.save(job);
      return job;
    }

    if (existsSync(audioPath)) {
      try {
        unlinkSync(audioPath);
      } catch {
        // ignore
      }
    }
    clearPublishedNarration(job.id);

    const provider = createVoiceProvider(config);
    const tmpDir = path.join(store.jobDir(job.id), 'voice-parts');
    mkdirSync(tmpDir, {recursive: true});

    let durationSeconds = 0;
    let isTestAudio = false;
    let model = config.voiceModel;
    let providerName: string = config.voiceProvider;
    let wordCues: Array<{text: string; startMs: number; endMs: number}> = [];

    if (segments.length === 0) {
      throw new Error('No hay texto de narración en las escenas');
    }

    // file provider already has a single custom take — don't re-slice it
    const usePauses =
      config.voiceProvider !== 'file' && segments.length > 1;

    if (!usePauses) {
      const result = await provider.synthesize(text, audioPath, {
        jobId: job.id,
      });
      durationSeconds = result.durationSeconds;
      isTestAudio = result.isTestAudio;
      model = result.model;
      providerName = result.provider;
      wordCues = result.cues ?? [];
    } else {
      const partPaths: string[] = [];
      let cursorMs = 0;
      const segmentTimings: Array<{
        text: string;
        pauseAfterSec: number;
        sceneId: string;
        durationSeconds: number;
      }> = [];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]!;
        const partPath = path.join(
          tmpDir,
          `part-${String(i).padStart(3, '0')}.wav`,
        );
        const result = await provider.synthesize(seg.text, partPath, {
          jobId: job.id,
        });
        isTestAudio = isTestAudio || result.isTestAudio;
        model = result.model;
        providerName = result.provider;
        partPaths.push(result.audioPath);
        segmentTimings.push({
          text: seg.text,
          pauseAfterSec: seg.pauseAfterSec,
          sceneId: seg.sceneId,
          durationSeconds: result.durationSeconds,
        });

        const cues =
          result.cues ??
          seg.text
            .split(/\s+/)
            .filter(Boolean)
            .map((w, wi, arr) => {
              const msEach = (result.durationSeconds * 1000) / arr.length;
              return {
                text: w,
                startMs: wi * msEach,
                endMs: (wi + 1) * msEach,
              };
            });

        for (const c of cues) {
          wordCues.push({
            text: c.text,
            startMs: cursorMs + c.startMs,
            endMs: cursorMs + c.endMs,
          });
        }
        cursorMs += result.durationSeconds * 1000;

        if (seg.pauseAfterSec > 0) {
          const silencePath = path.join(
            tmpDir,
            `silence-${String(i).padStart(3, '0')}.wav`,
          );
          makeSilenceWav(silencePath, seg.pauseAfterSec, result.sampleRate);
          partPaths.push(silencePath);
          cursorMs += seg.pauseAfterSec * 1000;
        }
      }

      ({durationSeconds} = concatWavFiles(partPaths, audioPath));

      store.writeJson(job.id, 'voice-meta.json', {
        durationSeconds,
        provider: providerName,
        model,
        isTestAudio,
        cues: wordCues,
        format: 'wav',
        segments: segmentTimings,
      });
    }

    job.artifacts.narrationAudio = audioPath;
    job.providerMeta.voiceProvider = providerName;
    job.providerMeta.voiceModel = model;
    job.config.voiceProvider = config.voiceProvider;
    job.config.voiceModel = model;
    job.audioIsTest = isTestAudio;
    job.hashes.narrationText = cacheKey;

    process.stdout.write(
      `[shorts] Narración generada: ${model} (${durationSeconds.toFixed(1)}s, ${segments.length} frases) → ${audioPath}\n`,
    );
    job.render = {
      ...job.render,
      durationSeconds,
    };

    // Multi-segment path already wrote voice-meta with per-scene timings
    if (!usePauses) {
      store.writeJson(job.id, 'voice-meta.json', {
        durationSeconds,
        provider: providerName,
        model,
        isTestAudio,
        cues: wordCues,
        format: 'wav',
        segments: segments.map((s) => ({
          text: s.text,
          pauseAfterSec: s.pauseAfterSec,
          sceneId: s.sceneId,
          // Single-file take: split evenly (no per-scene WAV parts)
          durationSeconds: durationSeconds / Math.max(1, segments.length),
        })),
      });
    }

    if (isTestAudio) {
      job.warnings.push(
        'AUDIO DE PRUEBA: el tono mock no es narración final. Configura VOICE_PROVIDER=macos-say u openai-tts.',
      );
      job.artifacts.narrationLoudnorm = undefined;
    } else {
      applyLoudnormArtifact(store, job);
    }

    store.setPhase(job, 'generating_voice', {
      status: 'done',
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    return job;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.setPhase(job, 'generating_voice', {
      status: 'failed',
      error: message,
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    throw err;
  }
};

const applyLoudnormArtifact = (store: JobStore, job: JobRecord): void => {
  if (!job.artifacts.narrationAudio) return;
  const result = ensureNarrationLoudnorm({
    jobDir: store.jobDir(job.id),
    narrationAudio: job.artifacts.narrationAudio,
    isTestAudio: Boolean(job.audioIsTest),
  });
  if (result.applied && result.loudnormPath) {
    job.artifacts.narrationLoudnorm = result.loudnormPath;
    process.stdout.write(
      `[shorts] Narración loudnorm → ${result.loudnormPath} (usada en render)\n`,
    );
  } else if (!job.audioIsTest) {
    job.artifacts.narrationLoudnorm = undefined;
    job.warnings.push(
      'No se pudo aplicar loudnorm a la narración; el render usará narration.wav original',
    );
  }
};
