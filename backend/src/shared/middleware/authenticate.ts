import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { prisma } from '../database/prisma'
import { AppError } from '../errors/app-error'

export interface AuthPayload {
  userId: string
  roles: Array<{ role: string; districtId: string | null }>
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing or invalid token'))
  }

  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload
    if (typeof payload.sub !== 'string' && typeof payload.userId !== 'string') {
      throw AppError.unauthorized('Invalid or expired token')
    }

    const userId = typeof payload.userId === 'string' ? payload.userId : payload.sub!
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } })
    if (!user || !user.isActive) throw AppError.unauthorized('Account is inactive')

    const roles = await prisma.userRole.findMany({
      where: { userId },
      select: { role: true, districtId: true },
    })

    req.auth = {
      userId,
      roles: roles.map((role) => ({ role: role.role, districtId: role.districtId })),
    }
    next()
  } catch (err) {
    if (err instanceof AppError) return next(err)
    next(AppError.unauthorized('Invalid or expired token'))
  }
}
