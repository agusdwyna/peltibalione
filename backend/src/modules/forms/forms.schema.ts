import { z } from 'zod'

export const formTypeSchema = z.enum([
  'PLAYER_REGISTRATION',
  'FACILITY_REGISTRATION',
  'COACH_REGISTRATION',
  'OFFICIAL_REGISTRATION',
])

export const createFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  districtId: z.string().uuid().optional(),
  type: formTypeSchema.optional(),
})

export const listFormsQuerySchema = z.object({
  districtId: z.string().uuid().optional(),
  type: formTypeSchema.optional(),
})

export type CreateFormInput = z.infer<typeof createFormSchema>
export type FormTypeInput = z.infer<typeof formTypeSchema>
