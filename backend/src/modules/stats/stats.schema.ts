import { z } from 'zod'

export const statsOverviewQuerySchema = z.object({
  districtId: z.string().uuid('Invalid district id').optional(),
})

export type StatsOverviewQuery = z.infer<typeof statsOverviewQuerySchema>
