import { z } from 'zod'

export const createFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  districtId: z.string().uuid().optional(),
})

export type CreateFormInput = z.infer<typeof createFormSchema>