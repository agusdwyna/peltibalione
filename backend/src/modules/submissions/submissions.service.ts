import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'
import { generatePlayerCode } from '../../shared/utils/player-code'
import { resolveAgeGroup } from '../../shared/utils/age-group'
import type { PublicSubmissionInput, ReviewSubmissionInput } from './submissions.schema'

/**
 * PRD §18 — duplicate detection.
 * Priority: NIK → (Nama + Tanggal Lahir).
 */
export async function detectDuplicate(input: {
  nik?: string
  fullName: string
  birthDate?: Date
}): Promise<{ match: 'NO_MATCH' | 'POSSIBLE_MATCH' | 'EXACT_MATCH'; playerId?: string }> {
  const personBirthDay = input.birthDate?.toISOString().slice(0, 10)

  if (input.nik) {
    const person = await prisma.person.findUnique({
      where: { nik: input.nik },
      include: { player: true },
    })
    if (person?.player) {
      return { match: 'EXACT_MATCH', playerId: person.player.id }
    }
    if (person) {
      return { match: 'POSSIBLE_MATCH' }
    }
  }

  // Nama + Tanggal Lahir
  if (personBirthDay) {
    const start = new Date(input.birthDate!)
    start.setHours(0, 0, 0, 0)
    const end = new Date(input.birthDate!)
    end.setHours(23, 59, 59, 999)

    const candidate = await prisma.person.findFirst({
      where: {
        fullName: { equals: input.fullName, mode: 'insensitive' },
        birthDate: { gte: start, lte: end },
      },
      include: { player: true },
    })
    if (candidate?.player) {
      return { match: 'POSSIBLE_MATCH', playerId: candidate.player.id }
    }
  }

  return { match: 'NO_MATCH' }
}

async function createSubmissionForForm(
  formId: string,
  input: Omit<PublicSubmissionInput, 'formToken'>,
) {
  const { match, playerId } = await detectDuplicate({
    nik: input.nik,
    fullName: input.fullName,
    birthDate: input.birthDate,
  })

  const submission = await prisma.formSubmission.create({
    data: {
      formId,
      status: 'SUBMITTED',
      fullName: input.fullName,
      birthPlace: input.birthPlace,
      birthDate: input.birthDate,
      nik: input.nik,
      address: input.address,
      phone: input.phone,
      clubName: input.clubName,
      instagram: input.instagram,
      whatsapp: input.whatsapp,
      ageGroup: input.ageGroup,
      pnpRank: input.pnpRank,
      pnpPeriod: input.pnpPeriod,
      duplicateMatch: match,
      duplicateOfPlayerId: playerId,
    },
  })

  // Link only unclaimed public uploads; never allow a caller to claim another entity's file.
  if (input.photoId) {
    await prisma.file.updateMany({
      where: { id: input.photoId, submissionId: null, entityType: 'SUBMISSION_PHOTO' },
      data: { submissionId: submission.id, entityId: submission.id },
    })
  }
  if (input.achievementPhotoId) {
    await prisma.file.updateMany({
      where: { id: input.achievementPhotoId, submissionId: null, entityType: 'SUBMISSION_ACHIEVEMENT' },
      data: { submissionId: submission.id, entityId: submission.id },
    })
  }

  return { id: submission.id, duplicateMatch: match, duplicateOfPlayerId: playerId }
}

export async function createSubmission(input: PublicSubmissionInput) {
  const form = await prisma.registrationForm.findFirst({
    where: { publicToken: input.formToken, status: 'ACTIVE' },
  })
  if (!form) throw AppError.badRequest('FORM_UNAVAILABLE', 'Form not found or inactive')
  return createSubmissionForForm(form.id, input)
}

// PRD §8/§14 — district admin adds a player through the district's active form, no formToken required
export async function createSubmissionInDistrict(
  input: Omit<PublicSubmissionInput, 'formToken'>,
  districtId: string,
  actorId: string,
) {
  const form = await prisma.registrationForm.findFirst({
    where: { districtId, type: 'PLAYER_REGISTRATION', status: 'ACTIVE' },
  })
  if (!form) {
    throw AppError.conflict(
      'ACTIVE_FORM_REQUIRED',
      'Tidak ada form pendaftaran aktif di workspace ini.',
    )
  }
  const result = await createSubmissionForForm(form.id, input)
  await writeAuditLog({
    actorId,
    action: 'CREATE_SUBMISSION',
    entityType: 'SUBMISSION',
    entityId: result.id,
    districtId,
    newValue: { viaAdmin: true, formId: form.id },
  })
  return result
}

/**
 * PRD §17 — review links a submission to a Player (CREATE) or rejects it.
 * Creates Person + Player master records on LINK.
 */
export async function reviewSubmission(
  submissionId: string,
  input: ReviewSubmissionInput,
  reviewerId: string,
  districtId: string,
) {
  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    include: { form: true },
  })
  if (!submission) throw AppError.notFound('Submission not found')
  if (submission.form.districtId !== districtId) throw AppError.forbidden('Out of district scope')
  if (submission.status !== 'SUBMITTED' && submission.status !== 'UNDER_REVIEW') {
    throw AppError.conflict('ALREADY_REVIEWED', 'Submission has already been processed')
  }

  if (input.action === 'REJECT') {
    const updated = await prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'REJECTED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: input.rejectionReason,
      },
    })
    await writeAuditLog({
      actorId: reviewerId,
      action: 'REJECT_SUBMISSION',
      entityType: 'SUBMISSION',
      entityId: submission.id,
      districtId: submission.form.districtId,
      oldValue: { status: submission.status },
      newValue: { status: 'REJECTED', rejectionReason: input.rejectionReason },
    })
    return updated
  }

  // LINK → create Player master record
  return prisma.$transaction(async (tx) => {
    // Upsert Person keyed by NIK (if provided) or create fresh
    let person = submission.nik
      ? await tx.person.findUnique({ where: { nik: submission.nik! } })
      : null

    if (!person) {
      person = await tx.person.create({
        data: {
          fullName: submission.fullName,
          birthPlace: submission.birthPlace,
          birthDate: submission.birthDate,
          nik: submission.nik,
          address: submission.address,
          phone: submission.phone,
          instagram: submission.instagram,
          whatsapp: submission.whatsapp,
        },
      })
    } else {
      person = await tx.person.update({
        where: { id: person.id },
        data: {
          address: submission.address ?? person.address,
          phone: submission.phone ?? person.phone,
          instagram: submission.instagram ?? person.instagram,
          whatsapp: submission.whatsapp ?? person.whatsapp,
        },
      })
    }

    // Resolve club (optional). If a clubId was given, use it; else optionally create from clubName.
    let clubId = input.clubId ?? null
    if (!clubId && submission.clubName) {
      const existingClub = await tx.club.findFirst({ where: { name: submission.clubName! } })
      if (existingClub) {
        clubId = existingClub.id
      } else {
        const created = await tx.club.create({
          data: { name: submission.clubName!, districtId: submission.form.districtId },
        })
        clubId = created.id
      }
    }

    const district = await tx.district.findUniqueOrThrow({ where: { id: submission.form.districtId } })
    const playerCode = await generatePlayerCode(district.code)

    // Kelompok umur diambil dari pilihan user (manual), bukan auto-resolve dari tanggal lahir
    const ageGroup = submission.ageGroup
      ? await tx.ageGroup.findFirst({ where: { code: submission.ageGroup } })
      : null

    const submissionFiles = await tx.file.findMany({
      where: { submissionId: submission.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, entityType: true },
    })
    const profilePhoto = submissionFiles.find((file) => file.entityType === 'SUBMISSION_PHOTO') ?? submissionFiles[0]

    const player = await tx.player.create({
      data: {
        playerCode,
        status: 'VERIFIED', // langsung VERIFIED — tidak perlu verification request
        personId: person.id,
        districtId: submission.form.districtId,
        clubId,
        ageGroup: ageGroup?.code ?? submission.ageGroup ?? null,
        ageGroupId: ageGroup?.id ?? null,
        photoId: profilePhoto?.id ?? null,
      },
    })

    if (submission.pnpRank != null) {
      await tx.playerPnpRanking.create({
        data: {
          playerId: player.id,
          rank: submission.pnpRank,
          period: submission.pnpPeriod ?? String(new Date().getFullYear()),
          updatedBy: reviewerId,
        },
      })
    }

    await tx.districtHistory.create({
      data: {
        playerId: player.id,
        toDistrictId: submission.form.districtId,
        changedBy: reviewerId,
      },
    })

    const updated = await tx.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'CREATED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        playerId: player.id,
      },
    })

    await writeAuditLog({
      actorId: reviewerId,
      action: 'CREATE_PLAYER',
      entityType: 'PLAYER',
      entityId: player.id,
      districtId: submission.form.districtId,
      newValue: { playerCode, districtId: submission.form.districtId },
    })

    return { submission: updated, player }
  })
}