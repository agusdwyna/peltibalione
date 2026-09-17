import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'
import { generatePlayerCode } from '../../shared/utils/player-code'
import { resolveAgeGroup } from '../../shared/utils/age-group'
import { ensureDistrictForm } from '../forms/forms.service'
import type { PublicSubmissionInput, ReviewSubmissionInput } from './submissions.schema'
import type { Gender } from '@prisma/client'

/**
 * PRD §18 — duplicate detection.
 * Priority: NIK → (Nama + Tanggal Lahir).
 */
export async function detectDuplicate(input: {
  nik?: string
  fullName: string
  birthDate?: Date
}): Promise<{ match: 'NO_MATCH' | 'POSSIBLE_MATCH' | 'EXACT_MATCH'; playerId?: string }> {
  const birthDay = input.birthDate?.toISOString().slice(0, 10)

  if (input.nik) {
    const player = await prisma.player.findUnique({ where: { nik: input.nik } })
    if (player) return { match: 'EXACT_MATCH', playerId: player.id }
  }

  // Nama + Tanggal Lahir
  if (birthDay) {
    const start = new Date(input.birthDate!)
    start.setHours(0, 0, 0, 0)
    const end = new Date(input.birthDate!)
    end.setHours(23, 59, 59, 999)

    const candidate = await prisma.player.findFirst({
      where: {
        fullName: { equals: input.fullName, mode: 'insensitive' },
        birthDate: { gte: start, lte: end },
      },
    })
    if (candidate) {
      return { match: 'POSSIBLE_MATCH', playerId: candidate.id }
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

  // Age group is derived server-side. The client supplies the required gender,
  // never a manually selected KU value.
  const resolvedAgeGroup = await resolveAgeGroup(input.birthDate, null, input.gender)

  const submission = await prisma.playerSubmission.create({
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
      gender: input.gender,
      ageGroup: resolvedAgeGroup?.code ?? null,
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
  // Admin entry is an internal operation and must not depend on a published
  // public form. Reuse the district's form as a container, creating a draft
  // automatically when this workspace has never opened one.
  const form = await ensureDistrictForm(districtId, actorId)
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
 * Creates a Player master record on LINK.
 */
export async function reviewSubmission(
  submissionId: string,
  input: ReviewSubmissionInput,
  reviewerId: string,
  districtId: string,
) {
  const submission = await prisma.playerSubmission.findUnique({
    where: { id: submissionId },
    include: { form: true },
  })
  if (!submission) throw AppError.notFound('Submission not found')
  if (submission.form.districtId !== districtId) throw AppError.forbidden('Out of district scope')
  if (submission.status !== 'SUBMITTED' && submission.status !== 'UNDER_REVIEW') {
    throw AppError.conflict('ALREADY_REVIEWED', 'Submission has already been processed')
  }

  if (input.action === 'REJECT') {
    const updated = await prisma.playerSubmission.update({
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
    if (submission.nik && await tx.player.findUnique({ where: { nik: submission.nik } })) {
      throw AppError.conflict('DUPLICATE_PLAYER', 'NIK sudah terdaftar sebagai pemain')
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

    // PRD §24 — KU dihitung otomatis dari tanggal lahir + gender. The
    // legacy stored ageGroup is retained only as a track-aware resolver hint.
    const resolved = await resolveAgeGroup(
      submission.birthDate,
      submission.ageGroup,
      (submission.gender as Gender | null) ?? undefined,
    )
    const ageGroup = resolved
      ? await tx.ageGroup.findUnique({ where: { id: resolved.id } })
      : null

    const submissionFiles = await tx.file.findMany({
      where: { submissionId: submission.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, entityType: true },
    })
    // Only the explicitly uploaded profile photo may become Player.photoId;
    // never fall back to an achievement file.
    const profilePhoto = submissionFiles.find((file) => file.entityType === 'SUBMISSION_PHOTO')
    const achievementPhoto = submissionFiles.find((file) => file.entityType === 'SUBMISSION_ACHIEVEMENT')

    const player = await tx.player.create({
      data: {
        playerCode,
        status: 'VERIFIED', // langsung VERIFIED — tidak perlu verification request
        fullName: submission.fullName,
        birthPlace: submission.birthPlace,
        birthDate: submission.birthDate,
        gender: submission.gender,
        nik: submission.nik,
        address: submission.address,
        phone: submission.phone,
        instagram: submission.instagram,
        whatsapp: submission.whatsapp,
        districtId: submission.form.districtId,
        clubId,
        ageGroup: ageGroup?.code ?? submission.ageGroup ?? null,
        ageGroupId: ageGroup?.id ?? null,
        photoId: profilePhoto?.id ?? null,
      },
    })

    // The registration photo becomes the player's permanent profile photo.
    // Keep submissionId for traceability back to the original registration.
    if (profilePhoto) {
      await tx.file.update({
        where: { id: profilePhoto.id },
        data: { entityType: 'PLAYER_PHOTO', entityId: player.id, playerId: player.id },
      })
    }

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

    // A submission achievement photo is the initial evidence of one achievement.
    // Do not create placeholder records when the optional photo is absent.
    if (achievementPhoto) {
      const trackRecord = await tx.playerTrackRecord.create({
        data: {
          playerId: player.id,
          title: 'Prestasi olahraga',
          eventName: 'Pengajuan pendaftaran pemain',
          eventDate: submission.createdAt,
          category: 'other',
          result: 'PARTICIPANT',
          description: 'Dokumentasi prestasi yang dilampirkan pada pengajuan pendaftaran pemain.',
          createdBy: reviewerId,
        },
      })

      const certificate = await tx.playerCertificate.create({
        data: {
          playerId: player.id,
          trackRecordId: trackRecord.id,
          title: 'Bukti prestasi olahraga',
          issuer: 'PELTI Bali',
          issuedAt: submission.createdAt,
          notes: 'Dibuat otomatis dari foto prestasi pada pengajuan pendaftaran pemain.',
          fileId: achievementPhoto.id,
          createdBy: reviewerId,
        },
      })

      await tx.file.update({
        where: { id: achievementPhoto.id },
        data: { entityType: 'PLAYER_CERTIFICATE', entityId: certificate.id },
      })

      await writeAuditLog({
        actorId: reviewerId,
        action: 'CREATE_PLAYER_TRACK_RECORD',
        entityType: 'PLAYER_TRACK_RECORD',
        entityId: trackRecord.id,
        districtId: submission.form.districtId,
        newValue: trackRecord,
      })
      await writeAuditLog({
        actorId: reviewerId,
        action: 'CREATE_PLAYER_CERTIFICATE',
        entityType: 'PLAYER_CERTIFICATE',
        entityId: certificate.id,
        districtId: submission.form.districtId,
        newValue: certificate,
      })
    }

    await tx.districtHistory.create({
      data: {
        playerId: player.id,
        toDistrictId: submission.form.districtId,
        changedBy: reviewerId,
      },
    })

    const updated = await tx.playerSubmission.update({
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