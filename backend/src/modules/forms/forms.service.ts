import { randomUUID } from 'crypto'
import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'
import type { CreateFormInput } from './forms.schema'

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