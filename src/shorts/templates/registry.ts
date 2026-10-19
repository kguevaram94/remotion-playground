import type {VideoScript} from '../domain/script.schema';
import {
  templateFamilyIdSchema,
  type TemplateFamilyId,
} from '../domain/script.schema';
import {COMMON_BEAT_RULES} from '../domain/beat-check';
import type {TemplateFamily} from './types';

/** Visuales que identifican logic-lateral (vs logic-puzzle genérico). */
export const LOGIC_LATERAL_VISUAL_TEMPLATES = [
  'logic-room',
  'switch-sequence',
  'bulb-state-reveal',
] as const;

const hasLogicLateralVisual = (script: VideoScript): boolean =>
  script.scenes.some((s) =>
    (LOGIC_LATERAL_VISUAL_TEMPLATES as readonly string[]).includes(
      s.visual.template,
    ),
  );

/**
 * Registro de familias (metadatos + beat).
 * `buildFromTitle` no vive aquí para evitar ciclos con `select` /
 * `puzzle-validator`; la generación sigue en `script-generator.ts`.
 */
export const TEMPLATE_FAMILIES: Record<TemplateFamilyId, TemplateFamily> = {
  'logic-lateral': {
    id: 'logic-lateral',
    formats: ['logic-puzzle'],
    beat: {
      common: COMMON_BEAT_RULES,
      exactSequence: [
        'hook',
        'instruction',
        'countdown',
        'explanation',
        'reveal',
        'outro',
      ],
      preferCommentCta: true,
    },
    allowedVisualTemplates: [
      'logic-room',
      'switch-sequence',
      'bulb-state-reveal',
      'countdown',
      'text',
      'hook',
    ],
    referenceTemplatePath: 'data/templates/script-logic-lateral.json',
  },
  math: {
    id: 'math',
    formats: ['math-puzzle'],
    beat: {
      common: COMMON_BEAT_RULES,
      // exactSequence: pendiente entrega B
      preferCommentCta: true,
    },
    allowedVisualTemplates: ['math-puzzle', 'countdown', 'hook', 'text'],
  },
  memory: {
    id: 'memory',
    formats: ['memory-challenge'],
    beat: {
      common: COMMON_BEAT_RULES,
      // exactSequence: pendiente entrega C
      preferCommentCta: true,
    },
    allowedVisualTemplates: ['memory-challenge', 'countdown', 'hook', 'text'],
  },
  illusion: {
    id: 'illusion',
    formats: ['optical-illusion'],
    beat: {
      common: COMMON_BEAT_RULES,
      // exactSequence: pendiente entrega D
      preferCommentCta: true,
    },
    allowedVisualTemplates: [
      'optical-illusion',
      'countdown',
      'hook',
      'text',
    ],
  },
  'find-different': {
    id: 'find-different',
    formats: ['find-different'],
    beat: {
      common: COMMON_BEAT_RULES,
      preferCommentCta: true,
    },
    allowedVisualTemplates: ['find-different', 'countdown', 'hook', 'text'],
  },
  'logic-puzzle': {
    id: 'logic-puzzle',
    formats: ['logic-puzzle'],
    beat: {
      common: COMMON_BEAT_RULES,
      preferCommentCta: true,
    },
    allowedVisualTemplates: [
      'logic-puzzle',
      'countdown',
      'hook',
      'text',
    ],
  },
};

export const KNOWN_TEMPLATE_FAMILY_IDS = templateFamilyIdSchema.options;

export const isTemplateFamilyId = (value: string): value is TemplateFamilyId =>
  (KNOWN_TEMPLATE_FAMILY_IDS as readonly string[]).includes(value);

/**
 * Infere la familia cuando `script.family` está ausente.
 * Determinista: format + visuales logic-lateral.
 */
export const inferFamilyId = (script: VideoScript): TemplateFamilyId => {
  switch (script.format) {
    case 'math-puzzle':
      return 'math';
    case 'memory-challenge':
      return 'memory';
    case 'optical-illusion':
      return 'illusion';
    case 'find-different':
      return 'find-different';
    case 'logic-puzzle':
      return hasLogicLateralVisual(script) ? 'logic-lateral' : 'logic-puzzle';
    default: {
      const _exhaustive: never = script.format;
      void _exhaustive;
      throw new Error(`Formato sin familia: ${String(script.format)}`);
    }
  }
};

export class UnknownTemplateFamilyError extends Error {
  readonly familyId: string;

  constructor(familyId: string) {
    super(
      `Familia de plantilla desconocida: "${familyId}". Conocidas: ${KNOWN_TEMPLATE_FAMILY_IDS.join(', ')}`,
    );
    this.name = 'UnknownTemplateFamilyError';
    this.familyId = familyId;
  }
}

/** Resuelve familia desde id explícito; error claro si desconocida. */
export const getTemplateFamily = (familyId: string): TemplateFamily => {
  if (!isTemplateFamilyId(familyId)) {
    throw new UnknownTemplateFamilyError(familyId);
  }
  return TEMPLATE_FAMILIES[familyId];
};

/**
 * Resolución determinista:
 * 1) `script.family` si está (debe ser conocida — Zod ya filtra en parse;
 *    esta vía cubre llamadas programáticas).
 * 2) Inferencia por format + visuales.
 */
export const resolveFamily = (script: VideoScript): TemplateFamily => {
  if (script.family !== undefined) {
    return getTemplateFamily(script.family);
  }
  return TEMPLATE_FAMILIES[inferFamilyId(script)];
};

export const resolveFamilyId = (script: VideoScript): TemplateFamilyId =>
  resolveFamily(script).id;
