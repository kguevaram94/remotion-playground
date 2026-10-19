import type {Format, TemplateFamilyId, VideoScript} from '../domain/script.schema';
import type {Scene} from '../domain/scene.schema';

export type {Format, TemplateFamilyId};

export type SceneType = Scene['type'];

/**
 * Reglas comunes a todas las familias (orden no impuesto).
 * Los beats exactos por familia se declaran aparte y solo se aplican
 * cuando la familia los define (p. ej. logic-lateral).
 */
export type CommonBeatRules = {
  /** Tipos de escena que deben aparecer al menos una vez. */
  requiredTypes: readonly SceneType[];
};

export type FamilyBeatSpec = {
  common: CommonBeatRules;
  /**
   * Secuencia ordenada oficial de la familia.
   * Solo logic-lateral la define en entrega A; math/memory/illusion
   * la añadirán cuando se aprueben B/C/D.
   */
  exactSequence?: readonly SceneType[];
  /**
   * Convención: avisar (no fallar) si CTA/outro no invita a comentar.
   * No altera scripts existentes ni fuerza interacción artificial.
   */
  preferCommentCta?: boolean;
};

export type TemplateBuildOptions = {
  language: string;
  fps: number;
  width: number;
  height: number;
  targetDurationSeconds: number;
};

/**
 * Contrato de familia de plantilla (entrega A).
 * La generación por título sigue en `script-generator.ts` (evitar ciclos
 * registry ↔ select ↔ puzzle-validator). Pulido math/memory/illusion = B/C/D.
 */
export type TemplateFamily = {
  id: TemplateFamilyId;
  /** Valores de `VideoScript.format` compatibles con esta familia. */
  formats: readonly Format[];
  beat: FamilyBeatSpec;
  /** Templates visuales esperados en puzzle/reveal/explanation (documentación). */
  allowedVisualTemplates: readonly string[];
  /** Path relativo al repo del JSON de referencia, si existe. */
  referenceTemplatePath?: string;
  /** Reservado; no se registra en `TEMPLATE_FAMILIES` en A (ciclos de import). */
  buildFromTitle?: (
    title: string,
    id: string,
    opts: TemplateBuildOptions,
  ) => VideoScript;
};
