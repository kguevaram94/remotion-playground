import {z} from 'zod';

export const transitionSchema = z.enum([
  'none',
  'fade',
  'slide-up',
  'zoom',
  'wipe',
]);

const gridCellSchema = z.object({
  id: z.string(),
  label: z.string(),
  isDifferent: z.boolean().default(false),
  color: z.string().optional(),
  shape: z.enum(['circle', 'square', 'triangle', 'star', 'text']).default('text'),
});

export const findDifferentVisualSchema = z.object({
  template: z.literal('find-different'),
  rows: z.number().int().min(2).max(6),
  cols: z.number().int().min(2).max(6),
  seed: z.number().int(),
  cells: z.array(gridCellSchema).min(4),
  answerCellId: z.string(),
  highlightProgress: z.number().min(0).max(1).default(0),
});

export const mathPuzzleVisualSchema = z.object({
  template: z.literal('math-puzzle'),
  expression: z.string(),
  operands: z.array(z.number()).optional(),
  operator: z.enum(['+', '-', '*', '/', '=']).optional(),
  result: z.number().optional(),
  steps: z.array(z.string()).default([]),
  matchsticks: z
    .object({
      before: z.array(z.string()),
      after: z.array(z.string()),
      moves: z.number().int().min(1).max(3),
    })
    .optional(),
  revealAnswer: z.string().optional(),
});

export const opticalIllusionVisualSchema = z.object({
  template: z.literal('optical-illusion'),
  illusionType: z.enum([
    'mueller-lyer',
    'ebbinghaus',
    'cafe-wall',
    'custom-shapes',
  ]),
  shapes: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(['line', 'circle', 'arrow', 'rect']),
        x: z.number(),
        y: z.number(),
        size: z.number(),
        rotation: z.number().default(0),
        color: z.string().default('#f8fafc'),
      }),
    )
    .default([]),
  showGuides: z.boolean().default(false),
  compareMode: z.boolean().default(false),
});

export const logicPuzzleVisualSchema = z.object({
  template: z.literal('logic-puzzle'),
  variant: z.enum(['nine-dots', 'river-crossing', 'custom']),
  dots: z
    .array(z.object({id: z.string(), x: z.number(), y: z.number()}))
    .optional(),
  lines: z
    .array(
      z.object({
        from: z.tuple([z.number(), z.number()]),
        to: z.tuple([z.number(), z.number()]),
      }),
    )
    .optional(),
  objects: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        x: z.number(),
        y: z.number(),
      }),
    )
    .default([]),
  revealProgress: z.number().min(0).max(1).default(0),
});

export const memoryChallengeVisualSchema = z.object({
  template: z.literal('memory-challenge'),
  items: z.array(
    z.object({
      id: z.string(),
      symbol: z.string(),
      color: z.string(),
    }),
  ),
  missingId: z.string().optional(),
  sequence: z.array(z.string()).optional(),
  phase: z.enum(['show', 'hide', 'ask', 'reveal']).default('show'),
});

export const countdownVisualSchema = z.object({
  template: z.literal('countdown'),
  seconds: z.number().positive(),
  label: z.string().default('Resuelve'),
  background: z.string().optional(),
});

export const hookVisualSchema = z.object({
  template: z.literal('hook'),
  badge: z.string().optional(),
  emphasis: z.string().optional(),
});

export const textVisualSchema = z.object({
  template: z.literal('text'),
  headline: z.string().optional(),
  body: z.string().optional(),
  accent: z.string().optional(),
});

/** Habitación partida: interruptores + bombilla (acertijo clásico). */
export const logicRoomVisualSchema = z.object({
  template: z.literal('logic-room'),
  switches: z.array(z.string()).min(2).max(4),
  bulb: z.enum(['off', 'on', 'hidden', 'warm']).default('off'),
  layout: z.enum(['split-room', 'stack']).default('split-room'),
  showRuleCards: z.boolean().default(false),
});

/** Secuencia animada de interruptores (A on → A off → B on…). */
export const switchSequenceVisualSchema = z.object({
  template: z.literal('switch-sequence'),
  steps: z
    .array(
      z.object({
        switch: z.string(),
        state: z.enum(['on', 'off']),
      }),
    )
    .min(1),
});

/** Revelación por estados de bombilla → interruptor. */
export const bulbStateRevealVisualSchema = z.object({
  template: z.literal('bulb-state-reveal'),
  states: z
    .array(
      z.object({
        state: z.enum(['on', 'off-warm', 'off-cold']),
        answer: z.string().min(1),
      }),
    )
    .min(2)
    .max(4),
});

export const twoDoorsVisualSchema = z.object({
  template: z.literal('two-doors'),
  doors: z.array(z.string()).min(2).max(2).default(['A', 'B']),
  guardians: z.array(z.string()).default(['truth', 'liar']),
});

export const guardianCardsVisualSchema = z.object({
  template: z.literal('guardian-cards'),
  showUnknownIdentities: z.boolean().default(true),
});

export const speechBubbleVisualSchema = z.object({
  template: z.literal('speech-bubble'),
  question: z.string().min(1),
  highlight: z.string().optional(),
});

export const twoCaseDiagramVisualSchema = z.object({
  template: z.literal('two-case-diagram'),
  cases: z.array(z.string()).min(1),
  result: z.string().default('wrong-door'),
});

export const riverPuzzleVisualSchema = z.object({
  template: z.literal('river-puzzle'),
  leftBank: z.array(z.string()).default([]),
  rightBank: z.array(z.string()).default([]),
  boatCapacity: z.number().int().min(1).default(1),
});

export const constraintCardsVisualSchema = z.object({
  template: z.literal('constraint-cards'),
  pairs: z.array(z.array(z.string()).min(2).max(2)).min(1),
});

export const riverSequenceVisualSchema = z.object({
  template: z.literal('river-sequence'),
  moves: z.array(z.array(z.string()).min(1)).min(1),
  stepRange: z.tuple([z.number(), z.number()]).optional(),
  finalState: z.string().optional(),
});

export const pipePuzzleVisualSchema = z.object({
  template: z.literal('pipe-puzzle'),
  source: z.string().optional(),
  glasses: z.array(z.string()).default(['A', 'B', 'C']),
  pipeLayout: z.string().optional(),
  blockedEdges: z.array(z.string()).default([]),
  openPath: z.array(z.string()).default([]),
  highlightMode: z.string().optional(),
  showBlockedEnds: z.boolean().default(false),
});

export const pipeTraceVisualSchema = z.object({
  template: z.literal('pipe-trace'),
  highlightedPath: z.array(z.string()).default([]),
  blockedEdges: z.array(z.string()).default([]),
});

export const pipeFillVisualSchema = z.object({
  template: z.literal('pipe-fill'),
  glass: z.string().min(1),
  fillFrom: z.number().min(0).max(1).default(0),
  fillTo: z.number().min(0).max(1).default(1),
  validatedPath: z.array(z.string()).default([]),
});

export const labeledBoxesVisualSchema = z.object({
  template: z.literal('labeled-boxes'),
  labels: z.array(z.string()).min(2).max(4),
  contentsHidden: z.boolean().default(true),
  crossOutLabels: z.boolean().default(false),
  highlightLabel: z.string().optional(),
});

export const boxDeductionVisualSchema = z.object({
  template: z.literal('box-deduction'),
  firstBoxLabel: z.string().min(1),
  sampleOneFruit: z.boolean().default(true),
  deduceRemainingBoxes: z.boolean().default(true),
});

export const visualSchema = z.discriminatedUnion('template', [
  findDifferentVisualSchema,
  mathPuzzleVisualSchema,
  opticalIllusionVisualSchema,
  logicPuzzleVisualSchema,
  memoryChallengeVisualSchema,
  countdownVisualSchema,
  hookVisualSchema,
  textVisualSchema,
  logicRoomVisualSchema,
  switchSequenceVisualSchema,
  bulbStateRevealVisualSchema,
  twoDoorsVisualSchema,
  guardianCardsVisualSchema,
  speechBubbleVisualSchema,
  twoCaseDiagramVisualSchema,
  riverPuzzleVisualSchema,
  constraintCardsVisualSchema,
  riverSequenceVisualSchema,
  pipePuzzleVisualSchema,
  pipeTraceVisualSchema,
  pipeFillVisualSchema,
  labeledBoxesVisualSchema,
  boxDeductionVisualSchema,
]);

const baseScene = {
  id: z.string().min(1),
  narration: z.string(),
  onScreenText: z.string(),
  durationSeconds: z.number().positive(),
  transition: transitionSchema.default('fade'),
  subtitleText: z.string(),
};

export const sceneSchema = z.discriminatedUnion('type', [
  z.object({...baseScene, type: z.literal('hook'), visual: visualSchema}),
  z.object({
    ...baseScene,
    type: z.literal('instruction'),
    visual: visualSchema,
  }),
  z.object({...baseScene, type: z.literal('puzzle'), visual: visualSchema}),
  z.object({
    ...baseScene,
    type: z.literal('countdown'),
    visual: countdownVisualSchema.or(visualSchema),
  }),
  z.object({...baseScene, type: z.literal('hint'), visual: visualSchema}),
  z.object({...baseScene, type: z.literal('reveal'), visual: visualSchema}),
  z.object({
    ...baseScene,
    type: z.literal('explanation'),
    visual: visualSchema,
  }),
  z.object({...baseScene, type: z.literal('outro'), visual: visualSchema}),
]);

export type Scene = z.infer<typeof sceneSchema>;
export type Visual = z.infer<typeof visualSchema>;
export type FindDifferentVisual = z.infer<typeof findDifferentVisualSchema>;
export type MathPuzzleVisual = z.infer<typeof mathPuzzleVisualSchema>;
export type OpticalIllusionVisual = z.infer<typeof opticalIllusionVisualSchema>;
export type LogicPuzzleVisual = z.infer<typeof logicPuzzleVisualSchema>;
export type MemoryChallengeVisual = z.infer<typeof memoryChallengeVisualSchema>;
export type LogicRoomVisual = z.infer<typeof logicRoomVisualSchema>;
export type SwitchSequenceVisual = z.infer<typeof switchSequenceVisualSchema>;
export type BulbStateRevealVisual = z.infer<typeof bulbStateRevealVisualSchema>;
export type TwoDoorsVisual = z.infer<typeof twoDoorsVisualSchema>;
export type GuardianCardsVisual = z.infer<typeof guardianCardsVisualSchema>;
export type SpeechBubbleVisual = z.infer<typeof speechBubbleVisualSchema>;
export type TwoCaseDiagramVisual = z.infer<typeof twoCaseDiagramVisualSchema>;
export type RiverPuzzleVisual = z.infer<typeof riverPuzzleVisualSchema>;
export type ConstraintCardsVisual = z.infer<typeof constraintCardsVisualSchema>;
export type RiverSequenceVisual = z.infer<typeof riverSequenceVisualSchema>;
export type PipePuzzleVisual = z.infer<typeof pipePuzzleVisualSchema>;
export type PipeTraceVisual = z.infer<typeof pipeTraceVisualSchema>;
export type PipeFillVisual = z.infer<typeof pipeFillVisualSchema>;
export type LabeledBoxesVisual = z.infer<typeof labeledBoxesVisualSchema>;
export type BoxDeductionVisual = z.infer<typeof boxDeductionVisualSchema>;
