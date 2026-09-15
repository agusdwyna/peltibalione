import { z } from 'zod'

export const systemRoleSchema = z.enum(['CENTRAL_ADMIN', 'DISTRICT_ADMIN', 'PLAYER'])
export type SystemRole = z.infer<typeof systemRoleSchema>

export const managedUserRoleSchema = z.object({
  role: systemRoleSchema,
  districtId: z.string().nullable().optional(),
  district: z.object({ id: z.string(), name: z.string(), code: z.string() }).nullable().optional(),
})

export const managedUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  userRoles: z.array(managedUserRoleSchema),
})
export type ManagedUser = z.infer<typeof managedUserSchema>

export const auditActorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
})

export const auditLogSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actor: auditActorSchema,
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  oldValue: z.unknown().nullable().optional(),
  newValue: z.unknown().nullable().optional(),
  timestamp: z.string(),
})
export type AuditLog = z.infer<typeof auditLogSchema>

export type UserRoleInput = { role: SystemRole; districtId?: string | null }
export type CreateUserInput = { email: string; password: string; name: string; roles: UserRoleInput[] }
export type UpdateUserInput = { email?: string; password?: string; name?: string; roles?: UserRoleInput[]; isActive?: boolean }
