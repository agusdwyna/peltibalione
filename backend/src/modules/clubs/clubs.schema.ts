import { z } from 'zod'

export const createClubSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  districtId: z.string().uuid().nullable().optional(),
})

export type CreateClubInput = z.infer<typeof createClubSchema>