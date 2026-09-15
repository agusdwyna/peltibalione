import bcrypt from 'bcryptjs'
import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'
import { paginationArgs } from '../../shared/utils/pagination'
import type { CreateUserInput, ListUsersInput, UpdateUserInput } from './users.schema'

async function validateRoleDistricts(roles: CreateUserInput['roles'] | NonNullable<UpdateUserInput['roles']>) {
  const districtIds = [...new Set(roles.map((role) => role.districtId).filter((id): id is string => Boolean(id)))]
  if (districtIds.length === 0) return

  const districts = await prisma.district.findMany({ where: { id: { in: districtIds } }, select: { id: true } })
  const found = new Set(districts.map((district) => district.id))
  const missing = districtIds.find((districtId) => !found.has(districtId))
  if (missing) throw AppError.notFound('District not found')
}

function roleAuditValue(roles: Array<{ role: string; districtId?: string | null }>) {
  return roles.map((role) => ({ role: role.role, districtId: role.districtId ?? null }))
}

export async function listUsers(query: ListUsersInput) {
  const where = {
    ...(query.q ? { OR: [
      { email: { contains: query.q, mode: 'insensitive' as const } },
      { name: { contains: query.q, mode: 'insensitive' as const } },
    ] } : {}),
    ...(query.districtId ? { userRoles: { some: { districtId: query.districtId } } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: { role: true, districtId: true, district: { select: { id: true, name: true, code: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...paginationArgs(query),
    }),
    prisma.user.count({ where }),
  ])

  return { data, total }
}

export async function getUser(id: string, districtId: string | null = null) {
  const user = await prisma.user.findFirst({
    where: {
      id,
      ...(districtId ? { userRoles: { some: { districtId } } } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        select: { role: true, districtId: true, district: { select: { id: true, name: true, code: true } } },
      },
    },
  })
  if (!user) throw AppError.notFound('User not found')
  return user
}

export async function createUser(input: CreateUserInput, actorId: string) {
  await validateRoleDistricts(input.roles)

  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw AppError.conflict('EMAIL_TAKEN', 'Email already in use')

  const passwordHash = await bcrypt.hash(input.password, 10)
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email: input.email, name: input.name, passwordHash },
    })

    await tx.userRole.createMany({
      data: input.roles.map((role) => ({
        userId: created.id,
        role: role.role,
        districtId: role.districtId ?? null,
      })),
    })

    return created
  })

  await writeAuditLog({
    actorId,
    action: 'CREATE_ADMIN',
    entityType: 'USER',
    entityId: user.id,
    districtId: input.roles.find((role) => role.role === 'DISTRICT_ADMIN')?.districtId ?? null,
    newValue: { email: user.email, name: user.name, roles: roleAuditValue(input.roles), isActive: user.isActive },
  })

  return getUser(user.id)
}

export async function updateUser(id: string, input: UpdateUserInput, actorId: string) {
  if (id === actorId && input.isActive === false) {
    throw AppError.badRequest('SELF_DISABLE_NOT_ALLOWED', 'You cannot disable your own account')
  }

  const current = await prisma.user.findUnique({
    where: { id },
    include: { userRoles: { select: { role: true, districtId: true } } },
  })
  if (!current) throw AppError.notFound('User not found')

  if (input.roles) await validateRoleDistricts(input.roles)
  if (input.email && input.email !== current.email) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } })
    if (existing) throw AppError.conflict('EMAIL_TAKEN', 'Email already in use')
  }

  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined
  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: {
        ...(input.email ? { email: input.email } : {}),
        ...(input.name ? { name: input.name } : {}),
        ...(passwordHash ? { passwordHash } : {}),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
    })

    if (input.roles) {
      await tx.userRole.deleteMany({ where: { userId: id } })
      await tx.userRole.createMany({
        data: input.roles.map((role) => ({ userId: id, role: role.role, districtId: role.districtId ?? null })),
      })
    }

    return user
  })

  const oldValue = {
    email: current.email,
    name: current.name,
    isActive: current.isActive,
    roles: roleAuditValue(current.userRoles),
  }
  const newValue = {
    email: updated.email,
    name: updated.name,
    isActive: updated.isActive,
    ...(input.roles ? { roles: roleAuditValue(input.roles) } : { roles: roleAuditValue(current.userRoles) }),
  }

  await writeAuditLog({
    actorId,
    action: input.isActive === undefined ? 'UPDATE_USER' : input.isActive ? 'ENABLE_ADMIN' : 'DISABLE_ADMIN',
    entityType: 'USER',
    entityId: id,
    districtId: (input.roles ?? current.userRoles).find((role) => role.role === 'DISTRICT_ADMIN')?.districtId ?? null,
    oldValue,
    newValue,
  })

  return getUser(id)
}
