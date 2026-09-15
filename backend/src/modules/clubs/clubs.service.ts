import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'
import type { CreateClubInput } from './clubs.schema'

export async function createClub(input: CreateClubInput, actorId: string) {
  if (input.districtId) {
    const district = await prisma.district.findUnique({ where: { id: input.districtId } })
    if (!district) throw AppError.notFound('District not found')
  }

  const existing = await prisma.club.findFirst({ where: { name: input.name } })
  if (existing) throw AppError.conflict('CLUB_EXISTS', 'Club with this name already exists')

  const club = await prisma.club.create({
    data: {
      name: input.name,
      districtId: input.districtId ?? null,
    },
    include: { district: { select: { name: true, code: true } } },
  })

  await writeAuditLog({
    actorId,
    action: 'CREATE_CLUB',
    entityType: 'CLUB',
    entityId: club.id,
    districtId: club.districtId,
    newValue: { name: club.name, districtId: club.districtId },
  })

  return club
}