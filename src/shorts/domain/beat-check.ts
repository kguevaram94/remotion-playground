import type {VideoScript} from './script.schema';
import type {CommonBeatRules, FamilyBeatSpec, SceneType} from '../templates/types';

export type BeatCheckResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
};

/** Reglas comunes acordadas (entrega A): presencia, no orden. */
export const COMMON_BEAT_RULES: CommonBeatRules = {
  requiredTypes: ['hook', 'reveal', 'outro'],
};

const sceneTypes = (script: VideoScript): SceneType[] =>
  script.scenes.map((s) => s.type);

/**
 * Validación compartida de beat: solo reglas comunes.
 * No impone la secuencia interna de logic-lateral a otras familias.
 */
export const checkCommonBeat = (
  script: VideoScript,
  rules: CommonBeatRules = COMMON_BEAT_RULES,
): BeatCheckResult => {
  const types = sceneTypes(script);
  const present = new Set(types);
  const missing = rules.requiredTypes.filter((t) => !present.has(t));
  if (missing.length) {
    return {
      ok: false,
      errors: [
        `Beat común incompleto: faltan escenas ${missing.join(', ')} (se requieren: ${rules.requiredTypes.join(', ')})`,
      ],
      warnings: [],
      details: {requiredTypes: rules.requiredTypes, present: [...present]},
    };
  }
  return {
    ok: true,
    errors: [],
    warnings: [],
    details: {requiredTypes: rules.requiredTypes, present: [...present]},
  };
};

/**
 * Checks opcionales definidos por la familia (secuencia exacta, CTA).
 * Separado del checker común; logic-lateral usa exactSequence.
 */
export const checkFamilyBeat = (
  script: VideoScript,
  beat: FamilyBeatSpec,
): BeatCheckResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, unknown> = {};

  if (beat.exactSequence) {
    const actual = sceneTypes(script);
    const expected = [...beat.exactSequence];
    details.exactSequence = expected;
    details.actualSequence = actual;
    if (
      actual.length !== expected.length ||
      actual.some((t, i) => t !== expected[i])
    ) {
      errors.push(
        `Beat de familia: se esperaba [${expected.join(' → ')}], hay [${actual.join(' → ')}]`,
      );
    }
  }

  if (beat.preferCommentCta) {
    const cta = `${script.callToAction} ${
      script.scenes.find((s) => s.type === 'outro')?.narration ?? ''
    } ${script.scenes.find((s) => s.type === 'outro')?.onScreenText ?? ''}`.toLowerCase();
    if (!/coment/.test(cta)) {
      warnings.push(
        'Convención CTA: se recomienda invitar a comentar en callToAction u outro (aviso, no bloqueo)',
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    details,
  };
};
