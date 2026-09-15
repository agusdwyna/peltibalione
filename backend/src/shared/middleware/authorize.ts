import { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/app-error'

type Role = 'CENTRAL_ADMIN' | 'DISTRICT_ADMIN' | 'PLAYER'

interface AuthorizeOptions {
  roles: Role[]
  requireDistrict?: boolean
}

/**
 * RBAC middleware per PRD §39: Role + Scope + Action.
 * Must run AFTER `authenticate`.
 */
export function authorize(options: AuthorizeOptions) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const auth = req.auth
    if (!auth) throw AppError.unauthorized()

    const hasRole = auth.roles.some((r) => options.roles.includes(r.role as Role))
    if (!hasRole) throw AppError.forbidden('Insufficient role')

    if (options.requireDistrict) {
      const districtRole = auth.roles.find((r) => r.role === 'DISTRICT_ADMIN')
      if (!districtRole?.districtId) {
        throw AppError.forbidden('District scope required')
      }
    }

    next()
  }
}

/** Helper: get the district scope from the authenticated user (null for CENTRAL_ADMIN). */
export function getDistrictScope(req: Request): string | null {
  const districtRole = req.auth?.roles.find((r) => r.role === 'DISTRICT_ADMIN')
  return districtRole?.districtId ?? null
}

/** Helper: check if user is central admin. */
export function isCentralAdmin(req: Request): boolean {
  return req.auth?.roles.some((r) => r.role === 'CENTRAL_ADMIN') ?? false
}
