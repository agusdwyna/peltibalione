import { z } from 'zod'

export const verificationDecisionSchema = z.object({
  notes: z.string().optional(),
})

export type VerificationDecisionInput = z.infer<typeof verificationDecisionSchema>