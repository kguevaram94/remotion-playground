import {existsSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import type {AppConfig} from '../config/env';
import {listCuratedSongFiles} from '../media/bg-music';
import {probeMedia} from '../media/ffmpeg';
import {resolveNarrationForRender} from '../media/narration-loudnorm';
import {parseSrt} from '../subtitles/srt';
import type {JobRecord, JobStore} from '../storage/job-store';

export type QualityReport = {
  ok: boolean;
  blocking: string[];
  warnings: string[];
  checks: Record<string, {ok: boolean; detail?: string}>;
};

export const runQualityCheck = (
  store: JobStore,
  job: JobRecord,
  config: AppConfig,
): JobRecord => {
  store.setPhase(job, 'quality_check', {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  store.save(job);

  const report: QualityReport = {
    ok: true,
    blocking: [],
    warnings: [],
    checks: {},
  };

  try {
    const videoPath = job.artifacts.videoMp4;
    const script = store.readScript(job.id);

    const exists = Boolean(videoPath && existsSync(videoPath));
    report.checks.videoExists = {ok: exists};
    if (!exists) {
      report.blocking.push('Falta el archivo de vídeo');
    } else {
      const size = statSync(videoPath!).size;
      const sizeOk = size > 10_000;
      report.checks.videoSize = {
        ok: sizeOk,
        detail: `${size} bytes`,
      };
      if (!sizeOk) report.blocking.push('Vídeo demasiado pequeño');

      const probe = probeMedia(videoPath!);
      if (probe.width && probe.height) {
        const dimOk =
          probe.width === (job.render?.width ?? config.width) ||
          Math.abs(probe.width - config.width) < 4;
        report.checks.resolution = {
          ok: dimOk,
          detail: `${probe.width}x${probe.height}`,
        };
        if (!dimOk) {
          report.warnings.push(
            `Resolución ${probe.width}x${probe.height} distinta de la esperada`,
          );
        }
      } else {
        report.warnings.push(
          'ffprobe no disponible (ni sistema ni `npx remotion ffprobe`)',
        );
      }

      if (probe.duration && job.render?.durationSeconds) {
        const delta = Math.abs(probe.duration - job.render.durationSeconds);
        const ok = delta < 1.5;
        report.checks.duration = {
          ok,
          detail: `video=${probe.duration.toFixed(2)}s expected≈${job.render.durationSeconds.toFixed(2)}s`,
        };
        if (!ok) {
          report.warnings.push('Duración de vídeo no coincide con la planificada');
        }
      }

      if (probe.hasAudio === false && !job.audioIsTest) {
        report.warnings.push('El MP4 no parece tener pista de audio');
      }
    }

    if (job.artifacts.thumbnailPng) {
      report.checks.thumbnail = {
        ok: existsSync(job.artifacts.thumbnailPng),
        detail: job.artifacts.thumbnailPng,
      };
    }

    if (script) {
      const emptyText = script.scenes.filter(
        (s) => !s.onScreenText.trim() && !s.subtitleText.trim(),
      );
      report.checks.requiredText = {
        ok: emptyText.length === 0,
        detail: emptyText.length ? emptyText.map((s) => s.id).join(',') : 'ok',
      };
      if (emptyText.length) {
        report.blocking.push('Hay escenas sin texto obligatorio');
      }

      report.checks.solutionPresent = {
        ok: Boolean(script.solution.summary && script.solution.explanation),
      };
      if (!report.checks.solutionPresent.ok) {
        report.blocking.push('Falta solución en el guion');
      }

      report.checks.validationStatus = {
        ok: script.solution.validationStatus !== 'failed',
        detail: script.solution.validationStatus,
      };
    }

    if (job.artifacts.subtitlesSrt && existsSync(job.artifacts.subtitlesSrt)) {
      const cues = parseSrt(readFileSync(job.artifacts.subtitlesSrt, 'utf8'));
      const totalMs = Math.round((job.render?.durationSeconds ?? 0) * 1000);
      const overflow = cues.filter(
        (c) => totalMs > 0 && c.endMs > totalMs + 250,
      );
      report.checks.subtitlesBounds = {
        ok: overflow.length === 0,
        detail: `${cues.length} cues`,
      };
      if (overflow.length) {
        report.warnings.push('Algunos subtítulos exceden la duración del vídeo');
      }
    } else {
      report.checks.subtitlesPresent = {ok: false};
      report.warnings.push('No hay subtítulos SRT');
    }

    if (job.audioIsTest) {
      report.checks.finalAudio = {
        ok: false,
        detail: 'Audio de prueba (mock)',
      };
      report.warnings.push(
        'El render usa audio de prueba; no publicar como narración final',
      );
      report.checks.narrationLoudnorm = {
        ok: true,
        detail: 'omitido (mock)',
      };
    } else {
      report.checks.finalAudio = {ok: true};
      const loudnormOk = Boolean(
        job.artifacts.narrationLoudnorm &&
          existsSync(job.artifacts.narrationLoudnorm),
      );
      const renderPath = resolveNarrationForRender({
        narrationAudio: job.artifacts.narrationAudio,
        narrationLoudnorm: job.artifacts.narrationLoudnorm,
        isTestAudio: false,
      });
      const usesLoudnorm =
        loudnormOk && renderPath === job.artifacts.narrationLoudnorm;
      report.checks.narrationLoudnorm = {
        ok: usesLoudnorm,
        detail: usesLoudnorm
          ? job.artifacts.narrationLoudnorm
          : 'faltante o no usado en render',
      };
      if (!usesLoudnorm) {
        report.warnings.push(
          'Narración loudnorm ausente o no seleccionada para el MP4',
        );
      }
    }

    const curated = listCuratedSongFiles();
    report.checks.bgmCatalog = {
      ok: true,
      detail:
        curated.length > 0
          ? `${curated.length} pista(s) curada(s)`
          : '0 pistas curadas (ver songs/README.md)',
    };
    if (curated.length === 0) {
      report.warnings.push(
        'Catálogo BGM vacío: el vídeo se generó sin música de fondo licenciada',
      );
    }

    const sfxDir = path.join(process.cwd(), 'public', 'sfx');
    report.checks.sfxProcedural = {
      ok: (['tick', 'ding', 'pop', 'whoosh'] as const).every((name) =>
        existsSync(path.join(sfxDir, `${name}.wav`)),
      ),
      detail: 'public/sfx/*.wav',
    };
    if (!report.checks.sfxProcedural.ok) {
      report.warnings.push('Faltan SFX procedurales; ejecuta npm run sfx:generate');
    }

    const assetsOk = Boolean(
      job.artifacts.scriptJson && existsSync(job.artifacts.scriptJson),
    );
    report.checks.artifacts = {ok: assetsOk};
    if (!assetsOk) report.blocking.push('Faltan artefactos de producción');

    report.ok = report.blocking.length === 0;
    const reportPath = store.writeJson(job.id, 'report.json', report);
    job.artifacts.reportJson = reportPath;
    job.warnings.push(...report.warnings);

    if (!report.ok) {
      throw new Error(report.blocking.join('; '));
    }

    store.setPhase(job, 'quality_check', {
      status: 'done',
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    return job;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.writeJson(job.id, 'report.json', report);
    store.setPhase(job, 'quality_check', {
      status: 'failed',
      error: message,
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    throw err;
  }
};
