import { Prisma } from '@prisma/client'
import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'
import { generateOfficialCode } from '../../shared/utils/official-code'
import { deleteStoredFile } from '../files/files.service'
import { ensureDistrictForm } from '../forms/forms.service'
import type {
  OfficialCertificateInput,
  OfficialFieldsInput,
  OfficialTournamentInput,
  PublicOfficialSubmissionInput,
  ReplaceOfficialCertificatesInput,
  ReplaceOfficialTournamentsInput,
  ReviewOfficialSubmissionInput,
  UpdateOfficialInput,
  VerifyOfficialInput,
} from './officials.schema'

const SUBMISSION_PHOTO_ENTITY = 'OFFICIAL_SUBMISSION_PHOTO'
const OFFICIAL_PHOTO_ENTITY = 'OFFICIAL_PHOTO'
const CERTIFICATE_ENTITY = 'OFFICIAL_CERTIFICATE'

/** Kolom wasit yang sama persis antara pengajuan dan master. */
function officialDataFrom(input: OfficialFieldsInput) {
  return {
    fullName: input.fullName,
    nik: input.nik,
    gender: input.gender,
    birthDate: input.birthDate,
    address: input.address,
    officialStatus: input.officialStatus,
    officiatingSince: input.officiatingSince,
    roles: input.roles,
    level: input.level ?? null,
    whatsapp: input.whatsapp,
    email: input.email || null,
    instagram: input.instagram ?? null,
    acceptingAssignments: input.acceptingAssignments,
    experience: input.experience ?? null,
  }
}

/**
 * Saring berkas yang benar-benar boleh diklaim: harus ada, bertipe benar, dan
 * belum terikat entitas lain. Tanpa ini pemanggil bisa menempelkan berkas milik
 * wasit lain hanya dengan menebak id-nya.
 */
async function claimableFileIds(client: Prisma.TransactionClient, ids: string[], entityType: string) {
  const unique = [...new Set(ids)]
  if (!unique.length) return new Set<string>()
  const rows = await client.file.findMany({
    where: {
      id: { in: unique },
      entityType,
      officialPhoto: { is: null },
      officialSubmissionPhoto: { is: null },
      officialCertificate: { is: null },
    },
    select: { id: true },
  })
  return new Set(rows.map((row) => row.id))
}

/** §6 — simpan daftar sertifikat milik satu pengajuan/master beserta berkasnya. */
async function createCertificates(
  client: Prisma.TransactionClient,
  owner: { officialId: string } | { officialSubmissionId: string },
  certificates: OfficialCertificateInput[],
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

    const created = await client.officialCertificate.create({
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

/** §7 — riwayat turnamen; jumlahnya menjadi angka "Jumlah Turnamen" (§5). */
async function createTournaments(
  client: Prisma.TransactionClient,
  owner: { officialId: string } | { officialSubmissionId: string },
  tournaments: OfficialTournamentInput[],
) {
  if (!tournaments.length) return
  await client.officialTournament.createMany({
    data: tournaments.map((tournament, index) => ({
      ...owner,
      name: tournament.name,
      year: tournament.year ?? null,
      level: tournament.level ?? null,
      role: tournament.role ?? null,
      location: tournament.location ?? null,
      sortOrder: index,
    })),
  })
}

async function createSubmissionForForm(formId: string, input: OfficialFieldsInput) {
  return prisma.$transaction(async (tx) => {
    // §16 — foto profil wajib; berkas yang sudah terpakai tidak boleh dicuri.
    const allowedPhoto = await claimableFileIds(tx, [input.photoId], SUBMISSION_PHOTO_ENTITY)
    if (!allowedPhoto.has(input.photoId)) {
      throw AppError.badRequest('PHOTO_UNAVAILABLE', 'Foto profil tidak valid atau sudah terpakai. Unggah ulang foto.')
    }

    const submission = await tx.officialSubmission.create({
      data: { formId, status: 'SUBMITTED', ...officialDataFrom(input), photoId: input.photoId },
    })
    await tx.file.update({ where: { id: input.photoId }, data: { entityId: submission.id } })

    await createCertificates(tx, { officialSubmissionId: submission.id }, input.certificates)
    await createTournaments(tx, { officialSubmissionId: submission.id }, input.tournaments)

    // §16 — NIK tidak boleh duplikat. Master-nya dijaga unique constraint;
    // di tahap pengajuan cukup ditandai agar admin melihatnya saat review.
    const duplicate = await tx.official.findUnique({ where: { nik: input.nik }, select: { id: true } })

    return {
      id: submission.id,
      photoId: submission.photoId,
      certificateCount: input.certificates.length,
      tournamentCount: input.tournaments.length,
      duplicateOfOfficialId: duplicate?.id ?? null,
    }
  })
}

export async function createOfficialSubmission(input: PublicOfficialSubmissionInput) {
  const { formToken, ...fields } = input
  const form = await prisma.registrationForm.findFirst({
    where: { publicToken: formToken, status: 'ACTIVE', type: 'OFFICIAL_REGISTRATION' },
  })
  if (!form) throw AppError.badRequest('FORM_UNAVAILABLE', 'Form tidak ditemukan atau sudah ditutup')
  return createSubmissionForForm(form.id, fields)
}

/** Admin kabupaten menambah wasit lewat form district-nya, tanpa token publik. */
export async function createOfficialSubmissionInDistrict(
  input: OfficialFieldsInput,
  districtId: string,
  actorId: string,
) {
  const form = await ensureDistrictForm(districtId, actorId, 'OFFICIAL_REGISTRATION')
  const result = await createSubmissionForForm(form.id, input)
  await writeAuditLog({
    actorId,
    action: 'CREATE_OFFICIAL_SUBMISSION',
    entityType: 'OFFICIAL_SUBMISSION',
    entityId: result.id,
    districtId,
    newValue: { viaAdmin: true, formId: form.id, fullName: input.fullName },
  })
  return result
}

/**
 * Review pengajuan: LINK membuat master Official (sekaligus verifikasi admin),
 * REJECT menutup pengajuan dengan alasan.
 */
export async function reviewOfficialSubmission(
  submissionId: string,
  input: ReviewOfficialSubmissionInput,
  reviewerId: string,
  districtId: string,
) {
  const submission = await prisma.officialSubmission.findUnique({
    where: { id: submissionId },
    include: { form: true },
  })
  if (!submission) throw AppError.notFound('Pengajuan wasit tidak ditemukan')
  if (submission.form.districtId !== districtId) throw AppError.forbidden('Out of district scope')
  if (submission.status !== 'SUBMITTED' && submission.status !== 'UNDER_REVIEW') {
    throw AppError.conflict('ALREADY_REVIEWED', 'Pengajuan sudah pernah diproses')
  }

  if (input.action === 'REJECT') {
    const updated = await prisma.officialSubmission.update({
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
      action: 'REJECT_OFFICIAL_SUBMISSION',
      entityType: 'OFFICIAL_SUBMISSION',
      entityId: submission.id,
      districtId: submission.form.districtId,
      oldValue: { status: submission.status },
      newValue: { status: 'REJECTED', rejectionReason: input.rejectionReason },
    })
    return { submission: updated }
  }

  // §16 — tolak lebih awal dengan pesan yang jelas daripada membiarkan unique
  // constraint melempar galat mentah saat master dibuat.
  const duplicate = await prisma.official.findUnique({
    where: { nik: submission.nik },
    select: { id: true, officialCode: true, fullName: true },
  })
  if (duplicate) {
    throw AppError.conflict(
      'DUPLICATE_NIK',
      `NIK ini sudah terdaftar atas nama ${duplicate.fullName} (${duplicate.officialCode}). Periksa kembali data wasit.`,
    )
  }

  const district = await prisma.district.findUniqueOrThrow({
    where: { id: submission.form.districtId },
    select: { code: true },
  })
  const officialCode = await generateOfficialCode(district.code)
  const verified = input.verificationStatus === 'TERVERIFIKASI'

  return prisma.$transaction(async (tx) => {
    const official = await tx.official.create({
      data: {
        officialCode,
        districtId: submission.form.districtId,
        fullName: submission.fullName,
        nik: submission.nik,
        gender: submission.gender,
        birthDate: submission.birthDate,
        address: submission.address,
        officialStatus: submission.officialStatus,
        officiatingSince: submission.officiatingSince,
        roles: submission.roles,
        level: submission.level,
        whatsapp: submission.whatsapp,
        email: submission.email,
        instagram: submission.instagram,
        acceptingAssignments: submission.acceptingAssignments,
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
        data: { entityType: OFFICIAL_PHOTO_ENTITY, entityId: official.id },
      })
    }

    // §6/§7 — baris sertifikat & riwayat turnamen dipindahkan ke master, bukan
    // disalin: berkasnya tetap menempel dan officialSubmissionId dibiarkan utuh
    // agar halaman review masih bisa menampilkan apa yang dulu diajukan.
    await tx.officialCertificate.updateMany({
      where: { officialSubmissionId: submission.id },
      data: { officialId: official.id },
    })
    await tx.officialTournament.updateMany({
      where: { officialSubmissionId: submission.id },
      data: { officialId: official.id },
    })

    const updated = await tx.officialSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'CREATED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        officialId: official.id,
      },
    })

    await writeAuditLog({
      actorId: reviewerId,
      action: 'CREATE_OFFICIAL',
      entityType: 'OFFICIAL',
      entityId: official.id,
      districtId: submission.form.districtId,
      newValue: {
        officialCode,
        fullName: official.fullName,
        verificationStatus: official.verificationStatus,
      },
    })

    return { submission: updated, official }
  })
}

/** Pastikan wasit ada dan berada dalam scope penulis. */
async function requireOfficial(officialId: string, districtId: string | null) {
  const official = await prisma.official.findUnique({ where: { id: officialId } })
  if (!official) throw AppError.notFound('Wasit tidak ditemukan')
  if (districtId && official.districtId !== districtId) throw AppError.forbidden('Out of district scope')
  return official
}

export async function updateOfficial(
  officialId: string,
  input: UpdateOfficialInput,
  actorId: string,
  districtId: string | null,
) {
  const existing = await requireOfficial(officialId, districtId)
  const { districtId: _ignored, ...fields } = input

  // Foto baru harus berkas bebas yang memang diunggah sebagai foto wasit.
  if (fields.photoId) {
    const allowed = await claimableFileIds(prisma, [fields.photoId], OFFICIAL_PHOTO_ENTITY)
    if (!allowed.has(fields.photoId)) {
      throw AppError.badRequest('INVALID_PHOTO', 'Foto tidak valid atau sudah terpakai. Unggah ulang foto.')
    }
  }

  // Unchecked variant supaya FK skalar (photoId) boleh ditulis langsung.
  const data: Prisma.OfficialUncheckedUpdateInput = { ...fields }
  // Email kosong disimpan sebagai null, bukan string kosong.
  if (fields.email !== undefined) data.email = fields.email || null

  const previousPhotoId = existing.photoId

  let updated
  try {
    updated = await prisma.official.update({ where: { id: officialId }, data })
  } catch (err) {
    // §16 — NIK unik; balas dengan pesan yang bisa dimengerti admin.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw AppError.conflict('DUPLICATE_NIK', 'NIK ini sudah terdaftar pada wasit lain')
    }
    throw err
  }

  // Foto lama tidak lagi dirujuk siapa pun — buang agar tidak jadi berkas yatim.
  if (fields.photoId && previousPhotoId && previousPhotoId !== updated.photoId) {
    await deleteStoredFile(previousPhotoId)
  }
  if (updated.photoId && updated.photoId !== previousPhotoId) {
    await prisma.file.update({
      where: { id: updated.photoId },
      data: { entityType: OFFICIAL_PHOTO_ENTITY, entityId: officialId },
    })
  }

  await writeAuditLog({
    actorId,
    action: 'UPDATE_OFFICIAL',
    entityType: 'OFFICIAL',
    entityId: officialId,
    districtId: existing.districtId,
    oldValue: existing,
    newValue: updated,
  })

  return updated
}

/** §10 — status verifikasi dan catatan admin. */
export async function verifyOfficial(
  officialId: string,
  input: VerifyOfficialInput,
  actorId: string,
  districtId: string | null,
) {
  const existing = await requireOfficial(officialId, districtId)

  const verified = input.verificationStatus === 'TERVERIFIKASI'
  const updated = await prisma.official.update({
    where: { id: officialId },
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
    action: 'VERIFY_OFFICIAL',
    entityType: 'OFFICIAL',
    entityId: officialId,
    districtId: existing.districtId,
    oldValue: { verificationStatus: existing.verificationStatus },
    newValue: { verificationStatus: updated.verificationStatus },
  })

  return updated
}

/**
 * §6 — ganti seluruh daftar sertifikat dengan keadaan akhir yang dikirim UI.
 * Baris yang masih disebut (punya `id`) dipertahankan beserta berkasnya; baris
 * yang hilang dari daftar dihapus berikut berkasnya.
 */
export async function replaceOfficialCertificates(
  officialId: string,
  input: ReplaceOfficialCertificatesInput,
  actorId: string,
  districtId: string | null,
) {
  const official = await requireOfficial(officialId, districtId)

  const existing = await prisma.officialCertificate.findMany({ where: { officialId } })
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
      await tx.officialCertificate.deleteMany({ where: { id: { in: removed.map((item) => item.id) } } })
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

        await tx.officialCertificate.update({
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

      const created = await tx.officialCertificate.create({
        data: {
          officialId,
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
    action: 'UPDATE_OFFICIAL_CERTIFICATES',
    entityType: 'OFFICIAL',
    entityId: officialId,
    districtId: official.districtId,
    oldValue: existing.map((item) => ({ name: item.name, issuer: item.issuer, year: item.year })),
    newValue: input.certificates.map((item) => ({ name: item.name, issuer: item.issuer, year: item.year })),
  })

  return prisma.officialCertificate.findMany({
    where: { officialId },
    orderBy: { sortOrder: 'asc' },
    include: { file: { select: { id: true, originalName: true, mimeType: true, size: true } } },
  })
}

/**
 * §7 — ganti seluruh riwayat turnamen. Tidak ada berkas yang menempel di sini,
 * jadi cukup hapus yang hilang lalu tulis ulang urutannya.
 */
export async function replaceOfficialTournaments(
  officialId: string,
  input: ReplaceOfficialTournamentsInput,
  actorId: string,
  districtId: string | null,
) {
  const official = await requireOfficial(officialId, districtId)

  const existing = await prisma.officialTournament.findMany({ where: { officialId } })
  const existingIds = new Set(existing.map((item) => item.id))
  const keptIds = new Set(
    input.tournaments
      .map((tournament) => tournament.id)
      .filter((id): id is string => Boolean(id) && existingIds.has(id!)),
  )

  await prisma.$transaction(async (tx) => {
    const removedIds = existing.filter((item) => !keptIds.has(item.id)).map((item) => item.id)
    if (removedIds.length) {
      await tx.officialTournament.deleteMany({ where: { id: { in: removedIds } } })
    }

    for (const [index, tournament] of input.tournaments.entries()) {
      const data = {
        name: tournament.name,
        year: tournament.year ?? null,
        level: tournament.level ?? null,
        role: tournament.role ?? null,
        location: tournament.location ?? null,
        sortOrder: index,
      }
      if (tournament.id && existingIds.has(tournament.id)) {
        await tx.officialTournament.update({ where: { id: tournament.id }, data })
        continue
      }
      await tx.officialTournament.create({ data: { officialId, ...data } })
    }
  })

  await writeAuditLog({
    actorId,
    action: 'UPDATE_OFFICIAL_TOURNAMENTS',
    entityType: 'OFFICIAL',
    entityId: officialId,
    districtId: official.districtId,
    oldValue: { count: existing.length },
    newValue: { count: input.tournaments.length },
  })

  return prisma.officialTournament.findMany({ where: { officialId }, orderBy: { sortOrder: 'asc' } })
}

/** Hapus berkas satu sertifikat tanpa menghapus baris sertifikatnya. */
export async function deleteCertificateFile(
  officialId: string,
  certificateId: string,
  actorId: string,
  districtId: string | null,
) {
  const official = await requireOfficial(officialId, districtId)
  const certificate = await prisma.officialCertificate.findFirst({ where: { id: certificateId, officialId } })
  if (!certificate) throw AppError.notFound('Sertifikat tidak ditemukan pada wasit ini')
  if (!certificate.fileId) throw AppError.notFound('Sertifikat ini tidak memiliki berkas')

  const fileId = certificate.fileId
  // Lepas FK unik dulu — baris file tidak bisa dihapus selama masih dirujuk.
  await prisma.officialCertificate.update({ where: { id: certificateId }, data: { fileId: null } })
  await deleteStoredFile(fileId)

  await writeAuditLog({
    actorId,
    action: 'DELETE_OFFICIAL_CERTIFICATE_FILE',
    entityType: 'OFFICIAL',
    entityId: officialId,
    districtId: official.districtId,
    oldValue: { certificateId, fileId },
  })

  return { id: certificateId, fileId: null }
}

export async function deleteOfficial(officialId: string, actorId: string, districtId: string | null) {
  const existing = await requireOfficial(officialId, districtId)

  const [certificates, submissions] = await Promise.all([
    prisma.officialCertificate.findMany({ where: { officialId }, select: { fileId: true } }),
    prisma.officialSubmission.findMany({ where: { officialId }, select: { photoId: true } }),
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
    await tx.official.update({ where: { id: officialId }, data: { photoId: null } })
    await tx.officialCertificate.updateMany({ where: { officialId }, data: { fileId: null } })
    await tx.officialSubmission.updateMany({ where: { officialId }, data: { officialId: null, photoId: null } })
    await tx.official.delete({ where: { id: officialId } })
  })

  // Berkas ikut dibuang agar tidak menyisakan file yatim di penyimpanan.
  for (const fileId of fileIds) {
    await deleteStoredFile(fileId)
  }

  await writeAuditLog({
    actorId,
    action: 'DELETE_OFFICIAL',
    entityType: 'OFFICIAL',
    entityId: officialId,
    districtId: existing.districtId,
    oldValue: existing,
  })

  return { id: officialId }
}
