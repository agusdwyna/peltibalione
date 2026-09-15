import { z } from 'zod'
import { paginationSchema } from '../../shared/utils/pagination'

export const auditQuerySchema = paginationSchema.extend({
  action: z.string().trim().max(100).optional(),
  entityType: z.string().trim().max(100).optional(),
  entityId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    path: ['to'],
    message: 'to must be on or after from',
  })

export type AuditQuery = z.infer<typeof auditQuerySchema>
