import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../shared/database/prisma'
import { env } from '../../config/env'
import { AppError } from '../../shared/errors/app-error'
import type { LoginInput } from './auth.schema'
import type { AuthPayload } from '../../shared/middleware/authenticate'

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Invalid credentials')
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash)
  if (!valid) {
    throw AppError.unauthorized('Invalid credentials')
  }

  const roles = await prisma.userRole.findMany({
    where: { userId: user.id },
    select: { role: true, districtId: true },
  })

  const payload: AuthPayload = {
    userId: user.id,
    roles: roles.map((r) => ({ role: r.role, districtId: r.districtId })),
  }

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: payload.roles,
    },
  }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, isActive: true },
  })
  if (!user) throw AppError.notFound('User not found')

  const roles = await prisma.userRole.findMany({
    where: { userId },
    select: { role: true, districtId: true },
  })

  return { ...user, roles }
}
