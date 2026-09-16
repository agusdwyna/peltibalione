import { z } from 'zod'

export const verificationDecisionSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
}).strict()

export const verificationIdSchema = z.object({
  id: z.string().uuid(),
})

export type VerificationDecisionInput = z.infer<typeof verificationDecisionSchema>