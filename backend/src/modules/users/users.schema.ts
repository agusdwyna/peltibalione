import { z } from 'zod'
import { paginationSchema } from '../../shared/utils/pagination'

const userRoleSchema = z.object({
  role: z.enum(['CENTRAL_ADMIN', 'DISTRICT_ADMIN', 'PLAYER']),
  districtId: z.string().uuid().nullable().optional().default(null),
})

function validateRoles(roles: Array<{ role: string; districtId?: string | null }>, ctx: z.RefinementCtx) {
  const seen = new Set<string>()
  let districtAdminCount = 0

  for (const role of roles) {
    const districtId = role.districtId ?? null

    if ((role.role === 'CENTRAL_ADMIN' || role.role === 'PLAYER') && districtId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['roles'],
        message: `${role.role} role cannot have districtId`,
      })
    }

    if (role.role === 'DISTRICT_ADMIN') {
      districtAdminCount += 1
      if (!districtId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['roles'],
          message: 'DISTRICT_ADMIN role requires districtId',
        })
      }
    }

    const key = `${role.role}:${districtId ?? 'none'}`
    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['roles'],
        message: 'Duplicate role assignment is not allowed',
      })
    }
    seen.add(key)
  }

  if (districtAdminCount > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['roles'],
      message: 'A user can have only one DISTRICT_ADMIN scope',
    })
  }
}

export const listUsersSchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  districtId: z.string().uuid().optional(),
})

export const createUserSchema = z
  .object({
    email: z.string().email('Invalid email format').transform((email) => email.toLowerCase()),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().trim().min(1, 'Name is required').max(200),
    roles: z.array(userRoleSchema).min(1, 'At least one role is required'),
  })
  .superRefine((input, ctx) => validateRoles(input.roles, ctx))

export const userIdSchema = z.object({
  id: z.string().uuid('Invalid user id'),
})

export const updateUserSchema = z
  .object({
    email: z.string().email('Invalid email format').transform((email) => email.toLowerCase()).optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    name: z.string().trim().min(1, 'Name is required').max(200).optional(),
    roles: z.array(userRoleSchema).min(1, 'At least one role is required').optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, { message: 'At least one field is required' })
  .superRefine((input, ctx) => {
    if (input.roles) validateRoles(input.roles, ctx)
  })

export const activationSchema = z.object({
  isActive: z.boolean(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ActivationInput = z.infer<typeof activationSchema>
export type ListUsersInput = z.infer<typeof listUsersSchema>
