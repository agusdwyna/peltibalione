import { Prisma } from '@prisma/client'
import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'
import { generateCoachCode } from '../../shared/utils/coach-code'
import { deleteStoredFile } from '../files/files.service'
import { ensureDistrictForm } from '../forms/forms.service'
import type {
  CoachCertificateInput,
  CoachFieldsInput,
  PublicCoachSubmissionInput,
  ReplaceCoachCertificatesInput,
  ReviewCoachSubmissionInput,
  UpdateCoachInput,
  VerifyCoachInput,
} from './coaches.schema'

const SUBMISSION_PHOTO_ENTITY = 'COACH_SUBMISSION_PHOTO'
const COACH_PHOTO_ENTITY = 'COACH_PHOTO'
const CERTIFICATE_ENTITY = 'COACH_CERTIFICATE'

/** Kolom pelatih yang sama persis antara pengajuan dan master. */
function coachDataFrom(input: CoachFieldsInput) {
  return {
    fullName: input.fullName,
    nik: input.nik,
    gender: input.gender,
    birthDate: input.birthDate,
    address: input.address,
    coachStatus: input.coachStatus,
    coachingSince: input.coachingSince ?? null,
    clubName: input.clubName ?? null,
    athleteCategories: input.athleteCategories,
    activeAthletes: input.activeAthletes ?? null,
    specializations: input.specializations,
    // Keterangan "Lainnya" tidak boleh tertinggal saat pilihan itu dicabut.
    otherSpecialization: input.specializations.includes('LAINNYA') ? input.otherSpecialization ?? null : null,
    whatsapp: input.whatsapp,
    email: input.email || null,
    instagram: input.instagram ?? null,
    acceptingNewAthletes: input.acceptingNewAthletes,
    experience: input.experience ?? null,
  }
}

/**
 * Saring berkas yang benar-benar boleh diklaim: harus ada, bertipe benar, dan
 * belum terikat entitas lain. Tanpa ini pemanggil bisa menempelkan berkas milik
 * pelatih lain hanya dengan menebak id-nya.
 */
async function claimableFileIds(client: Prisma.TransactionClient, ids: string[], entityType: string) {
  const unique = [...new Set(ids)]
  if (!unique.length) return new Set<string>()
  const rows = await client.file.findMany({
    where: {
      id: { in: unique },
      entityType,
      coachPhoto: { is: null },
      coachSubmissionPhoto: { is: null },
      coachCertificate: { is: null },
    },
    select: { id: true },
  })
  return new Set(rows.map((row) => row.id))
}

/** §7 — simpan daftar sertifikat milik satu pengajuan/master beserta berkasnya. */
async function createCertificates(
  client: Prisma.TransactionClient,
  owner: { coachId: string } | { coachSubmissionId: string },
  certificates: CoachCertificateInput[],
) {
  const allowed = await claimableFileIds(
    client,
    certificates.map((item) => item.fileId).filter((id): id is string => Boolean(id)),
    CERTIFICATE_ENTITY,
  )
  // Satu berkas hanya boleh menempel di satu sertifikat (fileId unik).
  const used = new Set<string>()

  for (const [index, certificate] of certificates.entries()) {
    const fileId = certificate.fileId && allowed.has(certificate.fileId) && !used.has(certificate.fileId)
      ? certificate.fileId
      : null
    if (fileId) used.add(fileId)

    const created = await client.coachCertificate.create({
      data: {
        ...owner,
        name: certificate.name,
        level: certificate.level ?? null,
        issuer: certificate.issuer ?? null,
        year: certificate.year ?? null,
        sortOrder: index,
        fileId,
      },
    })
    if (fileId) {
      await client.file.update({ where: { id: fileId }, data: { entityId: created.id } })
    }
  }
}

/** §5 — foto profil hanya diklaim bila berkasnya memang bebas. */
async function claimPhoto(client: Prisma.TransactionClient, photoId: string | undefined, entityType: string) {
  if (!photoId) return null
  const allowed = await claimableFileIds(client, [photoId], entityType)
  return allowed.has(photoId) ? photoId : null
}

async function createSubmissionForForm(formId: string, input: CoachFieldsInput) {
  return prisma.$transaction(async (tx) => {
    const photoId = await claimPhoto(tx, input.photoId, SUBMISSION_PHOTO_ENTITY)

    const submission = await tx.coachSubmission.create({
      data: { formId, status: 'SUBMITTED', ...coachDataFrom(input), photoId },
    })

    if (photoId) {
      await tx.file.update({ where: { id: photoId }, data: { entityId: submission.id } })
    }

    await createCertificates(tx, { coachSubmissionId: submission.id }, input.certificates)

    // §17 — NIK tidak boleh duplikat. Master-nya dijaga unique constraint;
    // di tahap pengajuan cukup ditandai agar admin melihatnya saat review.
    const duplicate = await tx.coach.findUnique({ where: { nik: input.nik }, select: { id: true } })

    return {
      id: submission.id,
      photoId,
      certificateCount: input.certificates.length,
      duplicateOfCoachId: duplicate?.id ?? null,
    }
  })
}

export async function createCoachSubmission(input: PublicCoachSubmissionInput) {
  const { formToken, ...fields } = input
  const form = await prisma.registrationForm.findFirst({
    where: { publicToken: formToken, status: 'ACTIVE', type: 'COACH_REGISTRATION' },
  })
  if (!form) throw AppError.badRequest('FORM_UNAVAILABLE', 'Form tidak ditemukan atau sudah ditutup')
  return createSubmissionForForm(form.id, fields)
}

/** Admin kabupaten menambah pelatih lewat form district-nya, tanpa perlu token publik. */
export async function createCoachSubmissionInDistrict(
  input: CoachFieldsInput,
  districtId: string,
  actorId: string,
) {
  const form = await ensureDistrictForm(districtId, actorId, 'COACH_REGISTRATION')
  const result = await createSubmissionForForm(form.id, input)
  await writeAuditLog({
    actorId,
    action: 'CREATE_COACH_SUBMISSION',
    entityType: 'COACH_SUBMISSION',
    entityId: result.id,
    districtId,
    newValue: { viaAdmin: true, formId: form.id, fullName: input.fullName },
  })
  return result
}

/**
 * Review pengajuan: LINK membuat master Coach (sekaligus verifikasi oleh admin),
 * REJECT menutup pengajuan dengan alasan.
 */
export async function reviewCoachSubmission(
  submissionId: string,
  input: ReviewCoachSubmissionInput,
  reviewerId: string,
  districtId: string,
) {
  const submission = await prisma.coachSubmission.findUnique({
    where: { id: submissionId },
    include: { form: true },
  })
  if (!submission) throw AppError.notFound('Pengajuan pelatih tidak ditemukan')
  if (submission.form.districtId !== districtId) throw AppError.forbidden('Out of district scope')
  if (submission.status !== 'SUBMITTED' && submission.status !== 'UNDER_REVIEW') {
    throw AppError.conflict('ALREADY_REVIEWED', 'Pengajuan sudah pernah diproses')
  }

  if (input.action === 'REJECT') {
    const updated = await prisma.coachSubmission.update({
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
      action: 'REJECT_COACH_SUBMISSION',
      entityType: 'COACH_SUBMISSION',
      entityId: submission.id,
      districtId: submission.form.districtId,
      oldValue: { status: submission.status },
      newValue: { status: 'REJECTED', rejectionReason: input.rejectionReason },
    })
    return { submission: updated }
  }

  // §17 — tolak lebih awal dengan pesan yang jelas daripada membiarkan unique
  // constraint melempar galat mentah saat master dibuat.
  const duplicate = await prisma.coach.findUnique({
    where: { nik: submission.nik },
    select: { id: true, coachCode: true, fullName: true },
  })
  if (duplicate) {
    throw AppError.conflict(
      'DUPLICATE_NIK',
      `NIK ini sudah terdaftar atas nama ${duplicate.fullName} (${duplicate.coachCode}). Periksa kembali data pelatih.`,
    )
  }

  const district = await prisma.district.findUniqueOrThrow({
    where: { id: submission.form.districtId },
    select: { code: true },
  })
  const coachCode = await generateCoachCode(district.code)
  const verified = input.verificationStatus === 'TERVERIFIKASI'

  return prisma.$transaction(async (tx) => {
    const coach = await tx.coach.create({
      data: {
        coachCode,
        districtId: submission.form.districtId,
        fullName: submission.fullName,
        nik: submission.nik,
        gender: submission.gender,
        birthDate: submission.birthDate,
        address: submission.address,
        coachStatus: submission.coachStatus,
        coachingSince: submission.coachingSince,
        clubName: submission.clubName,
        athleteCategories: submission.athleteCategories,
        activeAthletes: submission.activeAthletes,
        specializations: submission.specializations,
        otherSpecialization: submission.otherSpecialization,
        whatsapp: submission.whatsapp,
        email: submission.email,
        instagram: submission.instagram,
        acceptingNewAthletes: submission.acceptingNewAthletes,
        experience: submission.experience,
        // Foto pengajuan dipakai ulang; kolom unik terpisah, jadi pengajuan
        // tetap menyimpan jejak ke berkas yang sama.
        photoId: submission.photoId,
        verificationStatus: input.verificationStatus,
        adminNotes: input.adminNotes ?? null,
        verifiedAt: verified ? new Date() : null,
        verifiedBy: verified ? reviewerId : null,
      },
    })

    if (submission.photoId) {
      await tx.file.update({
        where: { id: submission.photoId },
        data: { entityType: COACH_PHOTO_ENTITY, entityId: coach.id },
      })
    }

    // §7 — baris sertifikat dipindahkan ke master, bukan disalin: berkasnya
    // tetap menempel dan coachSubmissionId dibiarkan utuh agar halaman review
    // masih bisa menampilkan apa yang dulu diajukan.
    await tx.coachCertificate.updateMany({
      where: { coachSubmissionId: submission.id },
      data: { coachId: coach.id },
    })

    const updated = await tx.coachSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'CREATED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        coachId: coach.id,
      },
    })

    await writeAuditLog({
      actorId: reviewerId,
      action: 'CREATE_COACH',
      entityType: 'COACH',
      entityId: coach.id,
      districtId: submission.form.districtId,
      newValue: {
        coachCode,
        fullName: coach.fullName,
        verificationStatus: coach.verificationStatus,
      },
    })

    return { submission: updated, coach }
  })
}

/** Pastikan pelatih ada dan berada dalam scope penulis. */
async function requireCoach(coachId: string, districtId: string | null) {
  const coach = await prisma.coach.findUnique({ where: { id: coachId } })
  if (!coach) throw AppError.notFound('Pelatih tidak ditemukan')
  if (districtId && coach.districtId !== districtId) throw AppError.forbidden('Out of district scope')
  return coach
}

export async function updateCoach(
  coachId: string,
  input: UpdateCoachInput,
  actorId: string,
  districtId: string | null,
) {
  const existing = await requireCoach(coachId, districtId)
  const { districtId: _ignored, ...fields } = input

  // Foto baru harus berkas bebas yang memang diunggah sebagai foto pelatih.
  if (fields.photoId) {
    const allowed = await claimableFileIds(prisma, [fields.photoId], COACH_PHOTO_ENTITY)
    if (!allowed.has(fields.photoId)) {
      throw AppError.badRequest('INVALID_PHOTO', 'Foto tidak valid atau sudah terpakai. Unggah ulang foto.')
    }
  }

  // Unchecked variant supaya FK skalar (photoId) boleh ditulis langsung.
  const data: Prisma.CoachUncheckedUpdateInput = { ...fields }
  // Email kosong disimpan sebagai null, bukan string kosong.
  if (fields.email !== undefined) data.email = fields.email || null

  // Keterangan "Lainnya" hanya bermakna selama spesialisasi itu masih dipilih.
  const nextSpecializations = fields.specializations ?? existing.specializations
  if (!nextSpecializations.includes('LAINNYA')) {
    data.otherSpecialization = null
  } else if (fields.specializations && !fields.otherSpecialization && !existing.otherSpecialization) {
    throw AppError.badRequest('OTHER_SPECIALIZATION_REQUIRED', 'Sebutkan spesialisasi lainnya')
  }

  const previousPhotoId = existing.photoId

  let updated
  try {
    updated = await prisma.coach.update({ where: { id: coachId }, data })
  } catch (err) {
    // §17 — NIK unik; balas dengan pesan yang bisa dimengerti admin.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw AppError.conflict('DUPLICATE_NIK', 'NIK ini sudah terdaftar pada pelatih lain')
    }
    throw err
  }

  // Foto lama tidak lagi dirujuk siapa pun — buang agar tidak jadi berkas yatim.
  if (fields.photoId !== undefined && previousPhotoId && previousPhotoId !== updated.photoId) {
    await deleteStoredFile(previousPhotoId)
  }
  if (updated.photoId && updated.photoId !== previousPhotoId) {
    await prisma.file.update({ where: { id: updated.photoId }, data: { entityType: COACH_PHOTO_ENTITY, entityId: coachId } })
  }

  await writeAuditLog({
    actorId,
    action: 'UPDATE_COACH',
    entityType: 'COACH',
    entityId: coachId,
    districtId: existing.districtId,
    oldValue: existing,
    newValue: updated,
  })

  return updated
}

/** §10 — status verifikasi dan catatan admin. */
export async function verifyCoach(
  coachId: string,
  input: VerifyCoachInput,
  actorId: string,
  districtId: string | null,
) {
  const existing = await requireCoach(coachId, districtId)

  const verified = input.verificationStatus === 'TERVERIFIKASI'
  const updated = await prisma.coach.update({
    where: { id: coachId },
    data: {
      verificationStatus: input.verificationStatus,
      adminNotes: input.adminNotes === undefined ? existing.adminNotes : input.adminNotes,
      // Tanggal & pelaku verifikasi dicatat sistem, bukan diisi manual (§10).
      verifiedAt: verified ? new Date() : null,
      verifiedBy: verified ? actorId : null,
    },
  })

  await writeAuditLog({
    actorId,
    action: 'VERIFY_COACH',
    entityType: 'COACH',
    entityId: coachId,
    districtId: existing.districtId,
    oldValue: { verificationStatus: existing.verificationStatus },
    newValue: { verificationStatus: updated.verificationStatus },
  })

  return updated
}

/**
 * §7 — ganti seluruh daftar sertifikat dengan keadaan akhir yang dikirim UI.
 * Baris yang masih disebut (punya `id`) dipertahankan beserta berkasnya; baris
 * yang hilang dari daftar dihapus berikut berkasnya.
 */
export async function replaceCoachCertificates(
  coachId: string,
  input: ReplaceCoachCertificatesInput,
  actorId: string,
  districtId: string | null,
) {
  const coach = await requireCoach(coachId, districtId)

  const existing = await prisma.coachCertificate.findMany({ where: { coachId } })
  const existingById = new Map(existing.map((item) => [item.id, item]))
  const keptIds = new Set(
    input.certificates
      .map((certificate) => certificate.id)
      .filter((id): id is string => Boolean(id) && existingById.has(id!)),
  )
  const removed = existing.filter((item) => !keptIds.has(item.id))

  // Berkas yang dilepas dari baris bertahan juga harus ikut dibuang.
  const replacedFileIds: string[] = []

  await prisma.$transaction(async (tx) => {
    if (removed.length) {
      await tx.coachCertificate.deleteMany({ where: { id: { in: removed.map((item) => item.id) } } })
    }

    const allowed = await claimableFileIds(
      tx,
      input.certificates
        .filter((certificate) => certificate.fileId && certificate.fileId !== existingById.get(certificate.id ?? '')?.fileId)
        .map((certificate) => certificate.fileId!)
        .filter(Boolean),
      CERTIFICATE_ENTITY,
    )
    const used = new Set<string>()

    for (const [index, certificate] of input.certificates.entries()) {
      const current = certificate.id ? existingById.get(certificate.id) : undefined

      if (current) {
        // Berkas lama dipertahankan bila UI mengirim balik id yang sama.
        const keepsCurrentFile = certificate.fileId != null && certificate.fileId === current.fileId
        const nextFileId = keepsCurrentFile
          ? current.fileId
          : certificate.fileId && allowed.has(certificate.fileId) && !used.has(certificate.fileId)
            ? certificate.fileId
            : null
        if (nextFileId && !keepsCurrentFile) used.add(nextFileId)
        if (current.fileId && current.fileId !== nextFileId) replacedFileIds.push(current.fileId)

        await tx.coachCertificate.update({
          where: { id: current.id },
          data: {
            name: certificate.name,
            level: certificate.level ?? null,
            issuer: certificate.issuer ?? null,
            year: certificate.year ?? null,
            sortOrder: index,
            fileId: nextFileId,
          },
        })
        if (nextFileId && !keepsCurrentFile) {
          await tx.file.update({ where: { id: nextFileId }, data: { entityId: current.id } })
        }
        continue
      }

      const fileId = certificate.fileId && allowed.has(certificate.fileId) && !used.has(certificate.fileId)
        ? certificate.fileId
        : null
      if (fileId) used.add(fileId)

      const created = await tx.coachCertificate.create({
        data: {
          coachId,
          name: certificate.name,
          level: certificate.level ?? null,
          issuer: certificate.issuer ?? null,
          year: certificate.year ?? null,
          sortOrder: index,
          fileId,
        },
      })
      if (fileId) {
        await tx.file.update({ where: { id: fileId }, data: { entityId: created.id } })
      }
    }
  })

  // Berkas baru boleh hilang dari disk hanya setelah transaksi sukses.
  for (const item of removed) {
    if (item.fileId) await deleteStoredFile(item.fileId)
  }
  for (const fileId of replacedFileIds) {
    await deleteStoredFile(fileId)
  }

  await writeAuditLog({
    actorId,
    action: 'UPDATE_COACH_CERTIFICATES',
    entityType: 'COACH',
    entityId: coachId,
    districtId: coach.districtId,
    oldValue: existing.map((item) => ({ name: item.name, issuer: item.issuer, year: item.year })),
    newValue: input.certificates.map((item) => ({ name: item.name, issuer: item.issuer, year: item.year })),
  })

  return prisma.coachCertificate.findMany({
    where: { coachId },
    orderBy: { sortOrder: 'asc' },
    include: { file: { select: { id: true, originalName: true, mimeType: true, size: true } } },
  })
}

/** Hapus berkas satu sertifikat tanpa menghapus baris sertifikatnya. */
export async function deleteCertificateFile(
  coachId: string,
  certificateId: string,
  actorId: string,
  districtId: string | null,
) {
  const coach = await requireCoach(coachId, districtId)
  const certificate = await prisma.coachCertificate.findFirst({ where: { id: certificateId, coachId } })
  if (!certificate) throw AppError.notFound('Sertifikat tidak ditemukan pada pelatih ini')
  if (!certificate.fileId) throw AppError.notFound('Sertifikat ini tidak memiliki berkas')

  const fileId = certificate.fileId
  // Lepas FK unik dulu — baris file tidak bisa dihapus selama masih dirujuk.
  await prisma.coachCertificate.update({ where: { id: certificateId }, data: { fileId: null } })
  await deleteStoredFile(fileId)

  await writeAuditLog({
    actorId,
    action: 'DELETE_COACH_CERTIFICATE_FILE',
    entityType: 'COACH',
    entityId: coachId,
    districtId: coach.districtId,
    oldValue: { certificateId, fileId },
  })

  return { id: certificateId, fileId: null }
}

/** Hapus foto profil pelatih berikut berkas fisiknya. */
export async function deleteCoachPhoto(coachId: string, actorId: string, districtId: string | null) {
  const coach = await requireCoach(coachId, districtId)
  if (!coach.photoId) throw AppError.notFound('Pelatih ini belum memiliki foto')

  const photoId = coach.photoId
  await prisma.coach.update({ where: { id: coachId }, data: { photoId: null } })
  await deleteStoredFile(photoId)

  await writeAuditLog({
    actorId,
    action: 'DELETE_COACH_PHOTO',
    entityType: 'COACH',
    entityId: coachId,
    districtId: coach.districtId,
    oldValue: { photoId },
  })

  return { id: coachId, photoId: null }
}

export async function deleteCoach(coachId: string, actorId: string, districtId: string | null) {
  const existing = await requireCoach(coachId, districtId)

  const [certificates, submissions] = await Promise.all([
    prisma.coachCertificate.findMany({ where: { coachId }, select: { fileId: true } }),
    prisma.coachSubmission.findMany({ where: { coachId }, select: { photoId: true } }),
  ])
  const fileIds = [
    ...new Set(
      [
        existing.photoId,
        ...certificates.map((item) => item.fileId),
        ...submissions.map((item) => item.photoId),
      ].filter((id): id is string => Boolean(id)),
    ),
  ]

  await prisma.$transaction(async (tx) => {
    // Lepas FK unik dulu agar baris file bisa dihapus setelahnya.
    await tx.coach.update({ where: { id: coachId }, data: { photoId: null } })
    await tx.coachCertificate.updateMany({ where: { coachId }, data: { fileId: null } })
    await tx.coachSubmission.updateMany({ where: { coachId }, data: { coachId: null, photoId: null } })
    await tx.coach.delete({ where: { id: coachId } })
  })

  // Berkas ikut dibuang agar tidak menyisakan file yatim di penyimpanan.
  for (const fileId of fileIds) {
    await deleteStoredFile(fileId)
  }

  await writeAuditLog({
    actorId,
    action: 'DELETE_COACH',
    entityType: 'COACH',
    entityId: coachId,
    districtId: existing.districtId,
    oldValue: existing,
  })

  return { id: coachId }
}
