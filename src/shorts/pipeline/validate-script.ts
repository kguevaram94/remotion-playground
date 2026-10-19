import type {AppConfig} from '../config/env';
import {parseVideoScript} from '../domain/script.schema';
import {validateScriptPuzzles} from '../domain/puzzle-validator';
import {resolveFamilyId} from '../templates/registry';
import type {JobRecord, JobStore} from '../storage/job-store';

export const runValidateScript = (
  store: JobStore,
  job: JobRecord,
  config: AppConfig,
): JobRecord => {
  store.setPhase(job, 'validating', {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  store.save(job);

  try {
    const raw = store.readScript(job.id);
    if (!raw) throw new Error('No hay script.json para validar');

    const script = parseVideoScript(raw);
    // Persistencia aditiva: scripts sin family siguen parseando; tras validar queda resuelta.
    script.family = resolveFamilyId(script);
    const result = validateScriptPuzzles(script);

    script.solution.validationStatus = result.level;
    const scriptPath = store.writeJson(job.id, 'script.json', script);
    job.artifacts.scriptJson = scriptPath;
    job.validation = {level: result.level, ok: result.ok};
    job.warnings.push(...result.warnings);

    if (!result.ok) {
      throw new Error(result.errors.join('; ') || 'Validación de acertijo fallida');
    }

    if (
      result.level === 'pending_review' ||
      result.level === 'partial'
    ) {
      if (config.humanReviewPolicy === 'block_unverified') {
        throw new Error(
          `Acertijo no verificado automáticamente (${result.level}). ` +
            `Cambia SHORTS_HUMAN_REVIEW_POLICY=warn_and_continue para continuar, o revisa el guion.`,
        );
      }
      if (config.humanReviewPolicy === 'require_review') {
        job.warnings.push('Marcado para revisión humana obligatoria');
        throw new Error('Revisión humana requerida antes del render');
      }
      job.warnings.push(
        `Validación ${result.level}: se continúa por política warn_and_continue`,
      );
    }

    store.writeJson(job.id, 'validation.json', result);
    store.setPhase(job, 'validating', {
      status: 'done',
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    return job;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.setPhase(job, 'validating', {
      status: 'failed',
      error: message,
      finishedAt: new Date().toISOString(),
    });
    store.save(job);
    throw err;
  }
};
