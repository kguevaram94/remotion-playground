import {z} from 'zod';
import {SCHEMA_VERSION} from '../config/defaults';
import {sceneSchema} from './scene.schema';

export const nicheSchema = z.enum([
  'puzzles',
  'math',
  'optical-illusion',
  'logic',
  'memory',
]);

export const formatSchema = z.enum([
  'find-different',
  'math-puzzle',
  'optical-illusion',
  'logic-puzzle',
  'memory-challenge',
]);

export const resolutionSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const solutionSchema = z.object({
  summary: z.string().min(1),
  explanation: z.string().min(1),
  answerKey: z.unknown().optional(),
  validationStatus: z
    .enum(['auto_validated', 'partial', 'pending_review', 'failed'])
    .default('pending_review'),
});

export const videoScriptSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  language: z.string().min(2),
  niche: nicheSchema,
  format: formatSchema,
  targetDurationSeconds: z.number().positive(),
  aspectRatio: z.literal('9:16'),
  fps: z.number().int().positive(),
  resolution: resolutionSchema,
  hook: z.string().min(1),
  narration: z.string().min(1),
  scenes: z.array(sceneSchema).min(3),
  solution: solutionSchema,
  callToAction: z.string().min(1),
  sources: z.array(z.string()).default([]),
  createdAt: z.string(),
  schemaVersion: z.number().int().default(SCHEMA_VERSION),
});

export type VideoScript = z.infer<typeof videoScriptSchema>;
export type Solution = z.infer<typeof solutionSchema>;

export const parseVideoScript = (data: unknown): VideoScript => {
  return videoScriptSchema.parse(data);
};
