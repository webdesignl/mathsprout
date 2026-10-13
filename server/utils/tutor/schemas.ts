import { z } from 'zod'
import type { AnyProblem } from '../../../app/utils/fraction'

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

/** What the model returns when it reads a problem. */
export const modelReadSchema = z.union([
  z.object({ unsupported: z.literal(true) }),
  z.object({
    operation: z.enum(OPERATIONS),
    operands: z.array(z.string().max(30)).min(2).max(6),
    problemText: z.string().max(600),
    confidence: z.enum(['high', 'low']),
  }),
])

export const hintInputSchema = z.object({
  problem: problemSchema,
  studentAnswer: z.string().max(40).optional(),
  stuck: z.boolean(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
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
export type Verdict = z.infer<typeof modelExplainSchema>['verdict']
