import { Prisma } from '@prisma/client'
import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'
import { generateFacilityCode } from '../../shared/utils/facility-code'
import { parseMapsCoordinates } from '../../shared/utils/maps-location'
import { deleteStoredFile } from '../files/files.service'
import { ensureDistrictForm } from '../forms/forms.service'
import { MAX_AMENITY_PHOTOS } from './facilities.schema'
import type {
  FacilityAmenityInput,
  FacilityFieldsInput,
  PublicFacilitySubmissionInput,
  ReplaceFacilityAmenitiesInput,
  ReviewFacilitySubmissionInput,
  UpdateFacilityInput,
  VerifyFacilityInput,
} from './facilities.schema'

const SUBMISSION_PHOTO_ENTITY = 'FACILITY_SUBMISSION_PHOTO'
const FACILITY_PHOTO_ENTITY = 'FACILITY_PHOTO'
const AMENITY_PHOTO_ENTITY = 'FACILITY_AMENITY_PHOTO'

/**
 * §4 — simpan daftar sarana milik satu pengajuan/master beserta fotonya.
 * Foto hanya diklaim bila belum terikat entitas lain, sehingga pemanggil tidak
 * bisa mencuri berkas milik lapangan lain.
 */
async function createAmenity(
  client: Prisma.TransactionClient,
  owner: { facilityId: string } | { facilitySubmissionId: string },
  amenity: FacilityAmenityInput,
  sortOrder: number,
) {
  const created = await client.facilityAmenity.create({
    data: {
      ...owner,
      code: amenity.code,
      customName: amenity.code === 'LAINNYA' ? amenity.customName ?? null : null,
      description: amenity.description ?? null,
      sortOrder,
    },
  })

  if (amenity.photoIds.length) {
    await client.file.updateMany({
      where: {
        id: { in: amenity.photoIds },
        facilityAmenityId: null,
        facilityId: null,
        facilitySubmissionId: null,
        entityType: AMENITY_PHOTO_ENTITY,
      },
      data: { facilityAmenityId: created.id, entityId: created.id },
    })
  }

  return created
}

async function createAmenities(
  client: Prisma.TransactionClient,
  owner: { facilityId: string } | { facilitySubmissionId: string },
  amenities: FacilityAmenityInput[],
) {
  for (const [index, amenity] of amenities.entries()) {
    await createAmenity(client, owner, amenity, index)
  }
}

/** Kolom data lapangan yang sama persis antara pengajuan dan master. */
function facilityDataFrom(input: FacilityFieldsInput) {
  const coordinates = parseMapsCoordinates(input.mapsUrl)
  return {
    name: input.name,
    address: input.address,
    mapsUrl: input.mapsUrl ?? null,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    description: input.description ?? null,
    courtCount: input.courtCount,
    courtType: input.courtType,
    surface: input.surface,
    courtLength: input.courtLength ?? null,
    courtWidth: input.courtWidth ?? null,
    clearanceBack: input.clearanceBack ?? null,
    clearanceLeft: input.clearanceLeft ?? null,
    clearanceRight: input.clearanceRight ?? null,
    surfaceCondition: input.surfaceCondition,
    hasLighting: input.hasLighting,
    // Jumlah lampu tidak boleh tertinggal saat penerangan dimatikan.
    lightCount: input.hasLighting ? input.lightCount ?? null : null,
    netCondition: input.netCondition,
    managerName: input.managerName ?? null,
    picName: input.picName ?? null,
    picPhone: input.picPhone ?? null,
    operationalStatus: input.operationalStatus,
    openTime: input.openTime ?? null,
    closeTime: input.closeTime ?? null,
    accessType: input.accessType,
    hourlyRate: input.hourlyRate ?? null,
  }
}

async function createSubmissionForForm(formId: string, input: FacilityFieldsInput) {
  const submission = await prisma.facilitySubmission.create({
    data: { formId, status: 'SUBMITTED', ...facilityDataFrom(input) },
  })

  await createAmenities(prisma, { facilitySubmissionId: submission.id }, input.amenities)

  // Hanya klaim unggahan publik yang belum terikat — pemanggil tidak boleh
  // mengambil alih berkas milik pengajuan lain.
  const claimed = await prisma.file.updateMany({
    where: {
      id: { in: input.photoIds },
      facilitySubmissionId: null,
      facilityId: null,
      entityType: SUBMISSION_PHOTO_ENTITY,
    },
    data: { facilitySubmissionId: submission.id, entityId: submission.id },
  })
  if (claimed.count === 0) {
    // Tanpa foto yang benar-benar terklaim, pengajuan tidak memenuhi §3.
    await prisma.facilitySubmission.delete({ where: { id: submission.id } })
    throw AppError.badRequest('PHOTOS_UNAVAILABLE', 'Foto lapangan tidak valid atau sudah terpakai. Unggah ulang foto.')
  }

  // Cover hanya boleh menunjuk foto yang berhasil diklaim pengajuan ini.
  const coverCandidateId = input.coverPhotoId ?? input.photoIds[0]
  const cover = await prisma.file.findFirst({
    where: { id: coverCandidateId, facilitySubmissionId: submission.id },
    select: { id: true },
  })
  const fallbackCover = cover
    ? null
    : await prisma.file.findFirst({
        where: { facilitySubmissionId: submission.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
  const coverPhotoId = cover?.id ?? fallbackCover?.id ?? null
  if (coverPhotoId) {
    await prisma.facilitySubmission.update({ where: { id: submission.id }, data: { coverPhotoId } })
  }

  return { id: submission.id, photoCount: claimed.count, coverPhotoId }
}

export async function createFacilitySubmission(input: PublicFacilitySubmissionInput) {
  const { formToken, ...fields } = input
  const form = await prisma.registrationForm.findFirst({
    where: { publicToken: formToken, status: 'ACTIVE', type: 'FACILITY_REGISTRATION' },
  })
  if (!form) throw AppError.badRequest('FORM_UNAVAILABLE', 'Form tidak ditemukan atau sudah ditutup')
  return createSubmissionForForm(form.id, fields)
}

/** Admin kabupaten menambah lapangan lewat form district-nya, tanpa perlu token publik. */
export async function createFacilitySubmissionInDistrict(
  input: FacilityFieldsInput,
  districtId: string,
  actorId: string,
) {
  const form = await ensureDistrictForm(districtId, actorId, 'FACILITY_REGISTRATION')
  const result = await createSubmissionForForm(form.id, input)
  await writeAuditLog({
    actorId,
    action: 'CREATE_FACILITY_SUBMISSION',
    entityType: 'FACILITY_SUBMISSION',
    entityId: result.id,
    districtId,
    newValue: { viaAdmin: true, formId: form.id, name: input.name },
  })
  return result
}

/**
 * Review pengajuan: LINK membuat master Facility (sekaligus verifikasi + grade
 * oleh admin kabupaten), REJECT menutup pengajuan dengan alasan.
 */
export async function reviewFacilitySubmission(
  submissionId: string,
  input: ReviewFacilitySubmissionInput,
  reviewerId: string,
  districtId: string,
) {
  const submission = await prisma.facilitySubmission.findUnique({
    where: { id: submissionId },
    include: { form: true },
  })
  if (!submission) throw AppError.notFound('Pengajuan lapangan tidak ditemukan')
  if (submission.form.districtId !== districtId) throw AppError.forbidden('Out of district scope')
  if (submission.status !== 'SUBMITTED' && submission.status !== 'UNDER_REVIEW') {
    throw AppError.conflict('ALREADY_REVIEWED', 'Pengajuan sudah pernah diproses')
  }

  if (input.action === 'REJECT') {
    const updated = await prisma.facilitySubmission.update({
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
      action: 'REJECT_FACILITY_SUBMISSION',
      entityType: 'FACILITY_SUBMISSION',
      entityId: submission.id,
      districtId: submission.form.districtId,
      oldValue: { status: submission.status },
      newValue: { status: 'REJECTED', rejectionReason: input.rejectionReason },
    })
    return { submission: updated }
  }

  const district = await prisma.district.findUniqueOrThrow({
    where: { id: submission.form.districtId },
    select: { code: true },
  })
  const facilityCode = await generateFacilityCode(district.code)
  const verified = input.verificationStatus === 'TERVERIFIKASI'

  return prisma.$transaction(async (tx) => {
    const facility = await tx.facility.create({
      data: {
        facilityCode,
        districtId: submission.form.districtId,
        name: submission.name,
        address: submission.address,
        mapsUrl: submission.mapsUrl,
        latitude: submission.latitude,
        longitude: submission.longitude,
        description: submission.description,
        courtCount: submission.courtCount,
        courtType: submission.courtType,
        surface: submission.surface,
        courtLength: submission.courtLength,
        courtWidth: submission.courtWidth,
        clearanceBack: submission.clearanceBack,
        clearanceLeft: submission.clearanceLeft,
        clearanceRight: submission.clearanceRight,
        surfaceCondition: submission.surfaceCondition,
        hasLighting: submission.hasLighting,
        lightCount: submission.lightCount,
        netCondition: submission.netCondition,
        managerName: submission.managerName,
        picName: submission.picName,
        picPhone: submission.picPhone,
        operationalStatus: submission.operationalStatus,
        openTime: submission.openTime,
        closeTime: submission.closeTime,
        accessType: submission.accessType,
        hourlyRate: submission.hourlyRate,
        verificationStatus: input.verificationStatus,
        grade: input.grade ?? null,
        adminNotes: input.adminNotes ?? null,
        verifiedAt: input.verificationStatus === undefined ? undefined : verified ? new Date() : null,
        verifiedBy: verified ? reviewerId : null,
      },
    })

    // Foto pengajuan menjadi foto permanen lapangan; facilitySubmissionId tetap
    // disimpan agar jejak ke pengajuan asal tidak hilang.
    await tx.file.updateMany({
      where: { facilitySubmissionId: submission.id },
      data: { entityType: FACILITY_PHOTO_ENTITY, entityId: facility.id, facilityId: facility.id },
    })

    // §4 — baris sarana dipindahkan ke master, bukan disalin: fotonya tetap
    // menempel dan facilitySubmissionId dibiarkan utuh agar halaman review
    // masih bisa menampilkan apa yang dulu diajukan.
    await tx.facilityAmenity.updateMany({
      where: { facilitySubmissionId: submission.id },
      data: { facilityId: facility.id },
    })

    if (submission.coverPhotoId) {
      await tx.facility.update({
        where: { id: facility.id },
        data: { coverPhotoId: submission.coverPhotoId },
      })
    }

    const updated = await tx.facilitySubmission.update({
      where: { id: submissionId },
      data: {
        status: 'CREATED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        facilityId: facility.id,
      },
    })

    await writeAuditLog({
      actorId: reviewerId,
      action: 'CREATE_FACILITY',
      entityType: 'FACILITY',
      entityId: facility.id,
      districtId: submission.form.districtId,
      newValue: {
        facilityCode,
        name: facility.name,
        verificationStatus: facility.verificationStatus,
        grade: facility.grade,
      },
    })

    return { submission: updated, facility }
  })
}

export async function updateFacility(
  facilityId: string,
  input: UpdateFacilityInput,
  actorId: string,
  districtId: string | null,
) {
  const existing = await prisma.facility.findUnique({ where: { id: facilityId } })
  if (!existing) throw AppError.notFound('Lapangan tidak ditemukan')
  if (districtId && existing.districtId !== districtId) throw AppError.forbidden('Out of district scope')

  const { districtId: _ignored, ...fields } = input

  // Cover harus salah satu foto milik lapangan ini.
  if (fields.coverPhotoId) {
    const owned = await prisma.file.findFirst({
      where: { id: fields.coverPhotoId, facilityId },
      select: { id: true },
    })
    if (!owned) throw AppError.badRequest('INVALID_COVER', 'Foto utama harus salah satu foto lapangan ini')
  }

  const data: Prisma.FacilityUpdateInput = { ...fields }
  // Koordinat selalu diturunkan ulang saat link Maps berubah (§1).
  if (fields.mapsUrl !== undefined) {
    const coordinates = parseMapsCoordinates(fields.mapsUrl)
    data.latitude = coordinates?.latitude ?? null
    data.longitude = coordinates?.longitude ?? null
  }
  // Mematikan penerangan ikut membersihkan jumlah lampu agar tidak menyesatkan.
  if (fields.hasLighting === false) data.lightCount = null

  const updated = await prisma.facility.update({ where: { id: facilityId }, data })

  await writeAuditLog({
    actorId,
    action: 'UPDATE_FACILITY',
    entityType: 'FACILITY',
    entityId: facilityId,
    districtId: existing.districtId,
    oldValue: existing,
    newValue: updated,
  })

  return updated
}

/** §7 — status verifikasi, grade, dan catatan admin. */
export async function verifyFacility(
  facilityId: string,
  input: VerifyFacilityInput,
  actorId: string,
  districtId: string | null,
) {
  const existing = await prisma.facility.findUnique({ where: { id: facilityId } })
  if (!existing) throw AppError.notFound('Lapangan tidak ditemukan')
  if (districtId && existing.districtId !== districtId) throw AppError.forbidden('Out of district scope')

  const verified = input.verificationStatus === 'TERVERIFIKASI'
  const updated = await prisma.facility.update({
    where: { id: facilityId },
    data: {
      verificationStatus: input.verificationStatus,
      grade: input.grade,
      adminNotes: input.adminNotes,
      // Tanggal & pelaku verifikasi dicatat sistem, bukan diisi manual.
      verifiedAt: input.verificationStatus === undefined ? undefined : verified ? new Date() : null,
      verifiedBy: input.verificationStatus === undefined ? undefined : verified ? actorId : null,
    },
  })

  await writeAuditLog({
    actorId,
    action: 'VERIFY_FACILITY',
    entityType: 'FACILITY',
    entityId: facilityId,
    districtId: existing.districtId,
    oldValue: { verificationStatus: existing.verificationStatus, grade: existing.grade },
    newValue: { verificationStatus: updated.verificationStatus, grade: updated.grade },
  })

  return updated
}

/** Pastikan lapangan ada dan berada dalam scope penulis. */
async function requireFacility(facilityId: string, districtId: string | null) {
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } })
  if (!facility) throw AppError.notFound('Lapangan tidak ditemukan')
  if (districtId && facility.districtId !== districtId) throw AppError.forbidden('Out of district scope')
  return facility
}

/**
 * §4 — ganti seluruh daftar sarana dengan keadaan akhir yang dikirim UI.
 * Baris yang masih disebut (punya `id`) dipertahankan beserta fotonya; baris
 * yang hilang dari daftar dihapus berikut berkas fotonya.
 */
export async function replaceFacilityAmenities(
  facilityId: string,
  input: ReplaceFacilityAmenitiesInput,
  actorId: string,
  districtId: string | null,
) {
  const facility = await requireFacility(facilityId, districtId)

  const existing = await prisma.facilityAmenity.findMany({
    where: { facilityId },
    include: { photos: { select: { id: true } } },
  })
  const existingById = new Map(existing.map((item) => [item.id, item]))
  const keptIds = new Set(
    input.amenities.map((amenity) => amenity.id).filter((id): id is string => Boolean(id) && existingById.has(id!)),
  )

  const removed = existing.filter((item) => !keptIds.has(item.id))

  await prisma.$transaction(async (tx) => {
    // Lepas foto dari baris yang akan dihapus agar onDelete: SetNull tidak
    // menyisakan berkas menggantung tanpa induk.
    if (removed.length) {
      await tx.file.updateMany({ where: { facilityAmenityId: { in: removed.map((item) => item.id) } }, data: { facilityAmenityId: null } })
      await tx.facilityAmenity.deleteMany({ where: { id: { in: removed.map((item) => item.id) } } })
    }

    for (const [index, amenity] of input.amenities.entries()) {
      const customName = amenity.code === 'LAINNYA' ? amenity.customName ?? null : null
      const description = amenity.description ?? null

      if (amenity.id && existingById.has(amenity.id)) {
        await tx.facilityAmenity.update({
          where: { id: amenity.id },
          data: { code: amenity.code, customName, description, sortOrder: index },
        })
        // Foto baru yang menyusul ikut diklaim; foto lama tetap menempel.
        if (amenity.photoIds.length) {
          await tx.file.updateMany({
            where: { id: { in: amenity.photoIds }, facilityAmenityId: null, facilityId: null, facilitySubmissionId: null, entityType: AMENITY_PHOTO_ENTITY },
            data: { facilityAmenityId: amenity.id, entityId: amenity.id },
          })
        }
        continue
      }

      await createAmenity(tx, { facilityId }, amenity, index)
    }
  })

  // Berkas foto baru boleh hilang dari disk hanya setelah transaksi sukses.
  for (const item of removed) {
    for (const photo of item.photos) await deleteStoredFile(photo.id)
  }

  await writeAuditLog({
    actorId,
    action: 'UPDATE_FACILITY_AMENITIES',
    entityType: 'FACILITY',
    entityId: facilityId,
    districtId: facility.districtId,
    oldValue: existing.map((item) => ({ code: item.code, customName: item.customName })),
    newValue: input.amenities.map((item) => ({ code: item.code, customName: item.customName })),
  })

  return prisma.facilityAmenity.findMany({
    where: { facilityId },
    orderBy: { sortOrder: 'asc' },
    include: { photos: { select: { id: true, originalName: true, mimeType: true, size: true }, orderBy: { createdAt: 'asc' } } },
  })
}

/** Lampirkan foto (yang sudah diunggah) ke satu sarana, dibatasi 5 foto. */
export async function attachAmenityPhotos(
  facilityId: string,
  amenityId: string,
  photoIds: string[],
  actorId: string,
  districtId: string | null,
) {
  const facility = await requireFacility(facilityId, districtId)
  const amenity = await prisma.facilityAmenity.findFirst({ where: { id: amenityId, facilityId } })
  if (!amenity) throw AppError.notFound('Sarana tidak ditemukan pada lapangan ini')

  const current = await prisma.file.count({ where: { facilityAmenityId: amenityId } })
  if (current + photoIds.length > MAX_AMENITY_PHOTOS) {
    throw AppError.badRequest('TOO_MANY_PHOTOS', `Maksimal ${MAX_AMENITY_PHOTOS} foto per sarana`)
  }

  const attached = await prisma.file.updateMany({
    where: { id: { in: photoIds }, facilityAmenityId: null, facilityId: null, facilitySubmissionId: null, entityType: AMENITY_PHOTO_ENTITY },
    data: { facilityAmenityId: amenityId, entityId: amenityId },
  })

  await writeAuditLog({
    actorId,
    action: 'ADD_FACILITY_AMENITY_PHOTO',
    entityType: 'FACILITY',
    entityId: facilityId,
    districtId: facility.districtId,
    newValue: { amenityId, attached: attached.count },
  })

  return { attached: attached.count }
}

/** Hapus satu foto sarana berikut berkas fisiknya. */
export async function deleteAmenityPhoto(
  facilityId: string,
  amenityId: string,
  photoId: string,
  actorId: string,
  districtId: string | null,
) {
  const facility = await requireFacility(facilityId, districtId)
  const photo = await prisma.file.findFirst({ where: { id: photoId, facilityAmenityId: amenityId } })
  if (!photo) throw AppError.notFound('Foto tidak ditemukan pada sarana ini')

  await deleteStoredFile(photoId)

  await writeAuditLog({
    actorId,
    action: 'DELETE_FACILITY_AMENITY_PHOTO',
    entityType: 'FACILITY',
    entityId: facilityId,
    districtId: facility.districtId,
    oldValue: { amenityId, photoId, originalName: photo.originalName },
  })

  return { id: photoId }
}

/**
 * Hapus satu foto lapangan berikut berkas fisiknya. Bila yang dihapus adalah
 * foto utama, foto tersisa paling awal naik menggantikannya supaya lapangan
 * tidak kehilangan cover secara diam-diam.
 */
export async function deleteFacilityPhoto(
  facilityId: string,
  photoId: string,
  actorId: string,
  districtId: string | null,
) {
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } })
  if (!facility) throw AppError.notFound('Lapangan tidak ditemukan')
  if (districtId && facility.districtId !== districtId) throw AppError.forbidden('Out of district scope')

  const photo = await prisma.file.findFirst({ where: { id: photoId, facilityId } })
  if (!photo) throw AppError.notFound('Foto tidak ditemukan pada lapangan ini')

  let nextCoverId: string | null = facility.coverPhotoId
  if (facility.coverPhotoId === photoId) {
    const replacement = await prisma.file.findFirst({
      where: { facilityId, id: { not: photoId } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    nextCoverId = replacement?.id ?? null
    // Lepas FK unik dulu — baris file tidak bisa dihapus selama masih jadi cover.
    await prisma.facility.update({ where: { id: facilityId }, data: { coverPhotoId: nextCoverId } })
  }

  await deleteStoredFile(photoId)

  await writeAuditLog({
    actorId,
    action: 'DELETE_FACILITY_PHOTO',
    entityType: 'FACILITY',
    entityId: facilityId,
    districtId: facility.districtId,
    oldValue: { photoId, originalName: photo.originalName, wasCover: facility.coverPhotoId === photoId },
    newValue: { coverPhotoId: nextCoverId },
  })

  return { id: photoId, coverPhotoId: nextCoverId }
}

export async function deleteFacility(facilityId: string, actorId: string, districtId: string | null) {
  const existing = await prisma.facility.findUnique({ where: { id: facilityId } })
  if (!existing) throw AppError.notFound('Lapangan tidak ditemukan')
  if (districtId && existing.districtId !== districtId) throw AppError.forbidden('Out of district scope')

  const photos = await prisma.file.findMany({ where: { facilityId }, select: { id: true } })

  await prisma.$transaction(async (tx) => {
    // Lepas cover dulu agar FK unique tidak menahan penghapusan.
    await tx.facility.update({ where: { id: facilityId }, data: { coverPhotoId: null } })
    await tx.facilitySubmission.updateMany({ where: { facilityId }, data: { facilityId: null } })
    await tx.file.updateMany({ where: { facilityId }, data: { facilityId: null } })
    await tx.facility.delete({ where: { id: facilityId } })
  })

  // Foto ikut dibuang agar tidak menyisakan berkas yatim di penyimpanan.
  for (const photo of photos) {
    await deleteStoredFile(photo.id)
  }

  await writeAuditLog({
    actorId,
    action: 'DELETE_FACILITY',
    entityType: 'FACILITY',
    entityId: facilityId,
    districtId: existing.districtId,
    oldValue: existing,
  })

  return { id: facilityId }
}
