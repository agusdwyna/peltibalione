import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'
import type { CreateFormInput } from './forms.schema'

export async function ensureDistrictForm(districtId: string, ownerUserId: string, attempt = 0) {
  const existing = await prisma.registrationForm.findFirst({
    where: { districtId, type: 'PLAYER_REGISTRATION' },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return existing

  const district = await prisma.district.findUnique({ where: { id: districtId } })
  if (!district) throw AppError.notFound('District not found')

  try {
    const form = await prisma.registrationForm.create({
      data: {
        type: 'PLAYER_REGISTRATION',
        title: `Form Pendaftaran Pemain ${district.name}`,
        status: 'DRAFT',
        publicToken: randomUUID().replace(/-/g, '').slice(0, 12),
        ownerUserId,
        districtId,
      },
      include: { district: { select: { name: true, code: true } } },
    })

    await writeAuditLog({
      actorId: ownerUserId,
      action: 'CREATE_FORM',
      entityType: 'FORM',
      entityId: form.id,
      districtId: form.districtId,
      newValue: { title: form.title, districtId: form.districtId, publicToken: form.publicToken },
    })

    // No DB unique on (districtId, type) — concurrent creates with distinct tokens
    // would both succeed. Keep oldest, delete own row if lost race.
    const siblings = await prisma.registrationForm.findMany({
      where: { districtId, type: 'PLAYER_REGISTRATION' },
      orderBy: { createdAt: 'asc' },
    })
    if (siblings.length > 1 && siblings[0].id !== form.id) {
      // Only delete own row if untouched (no submissions yet) — never steal a live form.
      const ownSubmissions = await prisma.formSubmission.count({ where: { formId: form.id } })
      if (ownSubmissions === 0) {
        await prisma.registrationForm.delete({ where: { id: form.id } })
      }
      return siblings[0]
    }

    return form
  } catch (err) {
    // Token collision (publicToken unique) — retry once, else refetch loser path
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined) ?? []
      if (target.includes('publicToken') && attempt === 0) {
        return ensureDistrictForm(districtId, ownerUserId, attempt + 1)
      }
      const raced = await prisma.registrationForm.findFirst({
        where: { districtId, type: 'PLAYER_REGISTRATION' },
        orderBy: { createdAt: 'desc' },
      })
      if (raced) return raced
    }
    throw err
  }
}

export async function createForm(input: CreateFormInput, ownerUserId: string, districtId: string) {
  // PRD §13 — satu form aktif per district per type
  const activeForm = await prisma.registrationForm.findFirst({
    where: { districtId, type: 'PLAYER_REGISTRATION', status: 'ACTIVE' },
  })
  if (activeForm) {
    throw AppError.conflict('ACTIVE_FORM_EXISTS', 'This district already has an active registration form')
  }

  const form = await prisma.registrationForm.create({
    data: {
      type: 'PLAYER_REGISTRATION',
      title: input.title,
      description: input.description,
      status: 'DRAFT',
      publicToken: randomUUID().replace(/-/g, '').slice(0, 12),
      ownerUserId,
      districtId,
    },
    include: { district: { select: { name: true, code: true } } },
  })

  await writeAuditLog({
    actorId: ownerUserId,
    action: 'CREATE_FORM',
    entityType: 'FORM',
    entityId: form.id,
    districtId: form.districtId,
    newValue: { title: form.title, districtId: form.districtId, publicToken: form.publicToken },
  })

  return form
}

export async function setFormStatus(
  formId: string,
  target: 'ACTIVE' | 'CLOSED',
  actorId: string,
  districtId: string,
) {
  const form = await prisma.registrationForm.findUnique({ where: { id: formId } })
  if (!form) throw AppError.notFound('Form not found')
  if (form.districtId !== districtId) throw AppError.forbidden('Out of district scope')

  if (target === 'ACTIVE') {
    // PRD §13 — enforce single active form per district (excluding this form)
    const otherActive = await prisma.registrationForm.findFirst({
      where: {
        districtId,
        type: 'PLAYER_REGISTRATION',
        status: 'ACTIVE',
        id: { not: formId },
      },
    })
    if (otherActive) {
      throw AppError.conflict('ACTIVE_FORM_EXISTS', 'Another active form already exists in this district')
    }
  }

  const action = target === 'ACTIVE'
    ? form.status === 'CLOSED' ? 'REOPEN_FORM' : 'OPEN_FORM'
    : 'CLOSE_FORM'

  const updated = await prisma.registrationForm.update({
    where: { id: formId },
    data: { status: target },
  })

  await writeAuditLog({
    actorId,
    action,
    entityType: 'FORM',
    entityId: form.id,
    districtId: form.districtId,
    oldValue: { status: form.status },
    newValue: { status: target },
  })

  return updated
}