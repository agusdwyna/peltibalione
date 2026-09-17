import { z } from 'zod'

export const roleSchema = z.enum(['CENTRAL_ADMIN', 'DISTRICT_ADMIN', 'PLAYER'])
export type Role = z.infer<typeof roleSchema>

export const authRoleSchema = z.object({
  role: roleSchema,
  districtId: z.string().nullable(),
})

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  isActive: z.boolean().optional(),
  roles: z.array(authRoleSchema),
})

export type AuthRole = z.infer<typeof authRoleSchema>
export type AuthUser = z.infer<typeof authUserSchema>

export const districtSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  _count: z.object({ players: z.number().optional(), admins: z.number().optional(), facilities: z.number().optional(), coaches: z.number().optional(), referees: z.number().optional() }).optional(),
})
export type District = z.infer<typeof districtSchema>
