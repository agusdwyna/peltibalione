import { randomUUID } from 'crypto'
import { Prisma, type FormType } from '@prisma/client'
import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'
import type { CreateFormInput } from './forms.schema'

/** Judul default per jenis form — dipakai saat form dibuat otomatis per district. */
function defaultTitle(type: FormType, districtName: string) {
  if (type === 'FACILITY_REGISTRATION') return `Form Pendataan Lapangan ${districtName}`
  if (type === 'COACH_REGISTRATION') return `Form Pendataan Pelatih ${districtName}`
  if (type === 'OFFICIAL_REGISTRATION') return `Form Pendataan Wasit ${districtName}`
  return `Form Pendaftaran Pemain ${districtName}`
}

export async function ensureDistrictForm(
  districtId: string,
  ownerUserId: string,
  type: FormType = 'PLAYER_REGISTRATION',
  attempt = 0,
) {
  const existing = await prisma.registrationForm.findFirst({
    where: { districtId, type },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return existing

  const district = await prisma.district.findUnique({ where: { id: districtId } })
  if (!district) throw AppError.notFound('District not found')

  try {
    const form = await prisma.registrationForm.create({
      data: {
        type,
        title: defaultTitle(type, district.name),
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
      newValue: { title: form.title, type, districtId: form.districtId, publicToken: form.publicToken },
    })

    // No DB unique on (districtId, type) — concurrent creates with distinct tokens
    // would both succeed. Keep oldest, delete own row if lost race.
    const siblings = await prisma.registrationForm.findMany({
      where: { districtId, type },
      orderBy: { createdAt: 'asc' },
    })
    if (siblings.length > 1 && siblings[0].id !== form.id) {
      // Only delete own row if untouched (no submissions yet) — never steal a live form.
      const [ownSubmissions, ownFacilitySubmissions, ownCoachSubmissions, ownOfficialSubmissions] = await Promise.all([
        prisma.playerSubmission.count({ where: { formId: form.id } }),
        prisma.facilitySubmission.count({ where: { formId: form.id } }),
        prisma.coachSubmission.count({ where: { formId: form.id } }),
        prisma.officialSubmission.count({ where: { formId: form.id } }),
      ])
      if (ownSubmissions === 0 && ownFacilitySubmissions === 0 && ownCoachSubmissions === 0 && ownOfficialSubmissions === 0) {
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
        return ensureDistrictForm(districtId, ownerUserId, type, attempt + 1)
      }
      const raced = await prisma.registrationForm.findFirst({
        where: { districtId, type },
        orderBy: { createdAt: 'desc' },
      })
      if (raced) return raced
    }
    throw err
  }
}

export async function createForm(input: CreateFormInput, ownerUserId: string, districtId: string) {
  const type = input.type ?? 'PLAYER_REGISTRATION'

  // PRD §13 — satu form aktif per district per type
  const activeForm = await prisma.registrationForm.findFirst({
    where: { districtId, type, status: 'ACTIVE' },
  })
  if (activeForm) {
    throw AppError.conflict('ACTIVE_FORM_EXISTS', 'This district already has an active registration form')
  }

  const form = await prisma.registrationForm.create({
    data: {
      type,
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
    newValue: { title: form.title, type, districtId: form.districtId, publicToken: form.publicToken },
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
    // PRD §13 — single active form per district *per type*; a facility form and a
    // player form may be open at the same time.
    const otherActive = await prisma.registrationForm.findFirst({
      where: {
        districtId,
        type: form.type,
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
