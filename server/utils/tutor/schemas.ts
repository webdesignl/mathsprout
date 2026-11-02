import { z } from 'zod'
import { parseMixed, type AnyProblem } from '../../../app/utils/fraction'

/** The most a typed or photographed number can be, so nothing overflows the engine. */
const MAX_WHOLE = 99
const MAX_PART = 999

export const mixedSchema = z.object({
  whole: z.number().int().min(0).max(MAX_WHOLE),
  num: z.number().int().min(0).max(MAX_PART),
  den: z.number().int().min(1).max(MAX_PART),
})

export const OPERATIONS = ['add', 'subtract', 'multiply', 'divide'] as const

export const problemSchema = z
  .object({
    op: z.enum(OPERATIONS),
    a: mixedSchema,
    b: mixedSchema,
  })
  // The shape is checked above, so it is safe to treat as the engine's problem type.
  .transform((problem) => problem as AnyProblem)

export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_TEXT_CHARS = 1000

const imageInput = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.enum(MEDIA_TYPES),
})
const textInput = z.object({
  text: z.string().trim().min(1).max(MAX_TEXT_CHARS),
})

/** Either a photo or typed text, not both and not neither. */
export const readInputSchema = z.union([imageInput, textInput])

/** A proper fraction such as 1/4 (more than 0, less than 1), checked by the fraction engine's parser. */
const properFractionText = (text: string) => {
  const m = parseMixed(text)
  return m !== null && m.whole === 0 && m.num > 0 && m.num < m.den
}
/** A positive whole or mixed number such as 250 or 4 2/3. */
const positiveNumberText = (text: string) => {
  const m = parseMixed(text)
  return m !== null && m.whole * m.den + m.num > 0
}

/**
 * An unknown-whole problem: takes in groups, then an amount left. Code builds the steps and the answer.
 * The shares and the amount are checked here so a badly written one is refused early; buildUnitPlan checks again.
 */
export const modelUnknownTotalSchema = z.object({
  unknownTotal: z.object({
    whole: z.string().max(80).optional(),
    groups: z
      .array(
        z.object({
          takes: z
            .array(z.object({ share: z.string().max(30).refine(properFractionText, 'a share is a fraction like 1/4'), name: z.string().max(80).optional() }))
            .min(1)
            .max(3),
        }),
      )
      .min(1)
      .max(2),
    left: z.object({ amount: z.string().max(30).refine(positiveNumberText, 'the amount left is a number above zero'), unit: z.string().max(6).optional(), name: z.string().max(80).optional() }),
  }),
  problemText: z.string().max(600),
  confidence: z.enum(['high', 'low']),
})

/** A same-amount-each-day problem: a fraction left after some days, an amount left after some more days. */
export const modelSameRateSchema = z.object({
  sameRate: z.object({
    whole: z.string().max(80).optional(),
    first: z.object({ days: z.string().max(10), left: z.string().max(30) }),
    second: z.object({ days: z.string().max(10), amountLeft: z.string().max(30) }),
    unit: z.string().max(12).optional(),
  }),
  problemText: z.string().max(600),
  confidence: z.enum(['high', 'low']),
})

/** A things-in-a-row problem (balloons, trees, poles): gaps and positions, with the distance between known ones. */
export const modelSpacingSchema = z.object({
  spacing: z.object({
    thing: z.string().max(30),
    plural: z.string().max(30).optional(),
    unit: z.string().max(12).optional(),
    gap: z.string().max(30).optional(),
    near: z.object({ from: z.string().max(3), to: z.string().max(3), distance: z.string().max(30) }).optional(),
    far: z.object({ from: z.string().max(3), distance: z.string().max(30) }),
  }),
  problemText: z.string().max(600),
  confidence: z.enum(['high', 'low']),
})

/** What the model returns when it reads a problem. */
export const modelReadSchema = z.union([
  z.object({ unsupported: z.literal(true) }),
  // Placed before the others: its own shape is checked first, so a plan with steps never matches it by accident.
  modelUnknownTotalSchema,
  modelSameRateSchema,
  modelSpacingSchema,
  z.object({
    operation: z.enum(OPERATIONS),
    operands: z.array(z.string().max(30)).min(2).max(6),
    problemText: z.string().max(600),
    confidence: z.enum(['high', 'low']),
  }),
  // A problem in several steps. Each operand is a number or "r1" (the answer to step 1).
  z.object({
    steps: z
      .array(
        z.object({
          op: z.enum(OPERATIONS),
          a: z.string().max(30),
          b: z.string().max(30),
          label: z.string().max(200),
          aName: z.string().max(80).optional(),
          bName: z.string().max(80).optional(),
          name: z.string().max(80).optional(),
        }),
      )
      .min(2)
      .max(5),
    whole: z.string().max(80).optional(),
    problemText: z.string().max(600),
    confidence: z.enum(['high', 'low']),
  }),
])

/** What the model returns when it copies a problem out of a photo. */
export const modelTranscribeSchema = z.union([
  z.object({ unreadable: z.literal(true) }),
  z.object({ text: z.string().max(MAX_TEXT_CHARS), confidence: z.enum(['high', 'low']) }),
])

export const hintInputSchema = z.object({
  problem: problemSchema,
  studentAnswer: z.string().max(40).optional(),
  stuck: z.boolean(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
})

export const MAX_PROBLEM_TEXT_CHARS = 600

export const understandInputSchema = z.object({
  problem: problemSchema,
  /** The problem in words, when she photographed or typed a word problem. */
  problemText: z.string().trim().max(MAX_PROBLEM_TEXT_CHARS).optional(),
})

export const MAX_EXPLANATION_CHARS = 500

export const explainInputSchema = z.object({
  problem: problemSchema,
  explanation: z.string().trim().min(1).max(MAX_EXPLANATION_CHARS),
})

/** What the model returns when it checks an explanation. */
export const modelExplainSchema = z.object({
  verdict: z.enum(['clear', 'partly', 'missing']),
  praise: z.string(),
  followUp: z.string().optional(),
})

export type ReadInput = z.infer<typeof readInputSchema>
export type HintInput = z.infer<typeof hintInputSchema>
export type ExplainInput = z.infer<typeof explainInputSchema>
export type UnderstandInput = z.infer<typeof understandInputSchema>
export type Verdict = z.infer<typeof modelExplainSchema>['verdict']
