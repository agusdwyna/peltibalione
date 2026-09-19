import { prisma } from '../../shared/database/prisma'
import { PUBLIC_COACH_STATUS, PUBLIC_FACILITY_STATUS, PUBLIC_OFFICIAL_STATUS } from '../../shared/utils/public-visibility'

/**
 * Relasi berkas yang menentukan hak aksesnya.
 *
 * Nama-nama ini mengikuti `model File` di schema Prisma — `playerPhoto` adalah
 * kebalikan dari `Player.photoId` (foto diri), sedangkan `player` adalah
 * kebalikan dari `Player.files` (berkas yang menempel lewat `playerId`).
 * Keduanya menunjuk Player, tapi lewat kolom yang berbeda, jadi keduanya
 * diperlukan untuk mengetahui kabupaten pemiliknya.
 *
 * Daftar ini sengaja TIDAK memuat relasi sertifikat (`certificate`,
 * `coachCertificate`, `officialCertificate`) maupun foto pengajuan
 * (`submission`, `coachSubmissionPhoto`, dst.). Karena keputusan publiknya
 * memakai daftar-putih, relasi yang tidak disebut otomatis tertutup — jadi
 * tidak perlu ada di sini untuk ditolak.
 */
const DISTRICT_ONLY = { select: { id: true, districtId: true } } as const
const VERIFIABLE = { select: { id: true, districtId: true, verificationStatus: true } } as const
const VIA_FORM = { select: { form: { select: { districtId: true } } } } as const

const FILE_INCLUDE = {
  // Foto diri pemain — selalu privat, tapi perlu untuk menentukan kabupaten.
  playerPhoto: DISTRICT_ONLY,
  player: DISTRICT_ONLY,

  facility: VERIFIABLE,
  facilityCover: VERIFIABLE,
  facilityAmenity: {
    select: {
      facility: VERIFIABLE,
      facilitySubmission: VIA_FORM,
    },
  },
  facilitySubmission: VIA_FORM,
  facilitySubmissionCover: VIA_FORM,

  coachPhoto: VERIFIABLE,
  coachSubmissionPhoto: VIA_FORM,
  officialPhoto: VERIFIABLE,
  officialSubmissionPhoto: VIA_FORM,

  submission: VIA_FORM,
} as const

export type FileWithRelations = Awaited<ReturnType<typeof findFileWithRelations>>

/** Ambil berkas beserta seluruh relasi yang menentukan hak aksesnya. */
export async function findFileWithRelations(fileId: string) {
  return prisma.file.findUnique({ where: { id: fileId }, include: FILE_INCLUDE })
}

/**
 * Apakah berkas ini boleh dilihat TANPA login?
 *
 * Yang menentukan adalah RELASI di database, bukan `entityType`. `entityType`
 * diturunkan dari `kind` yang dikirim klien saat mengunggah
 * (`publicUploadEntityType`), jadi nilainya tidak boleh dipercaya sebagai
 * dasar keputusan keamanan.
 *
 * Aturannya sengaja berupa daftar-putih: apa pun yang tidak disebut di sini
 * TIDAK publik. Dengan begitu jenis berkas baru otomatis tertutup, bukan
 * otomatis terbuka. Yang otomatis tertutup antara lain:
 *
 *  - foto diri pemain (`playerPhoto`, `player`) — pemain KU 8–18 adalah
 *    anak-anak;
 *  - seluruh berkas sertifikat — foto sertifikat lazim memuat NIK;
 *  - foto pengajuan yang belum disetujui (`submission`, `*SubmissionPhoto`).
 *
 * Hanya berkas milik entitas TERVERIFIKASI yang lolos, supaya foto lapangan
 * yang masih ditinjau tidak bocor lewat jalur ini.
 */
export function isPubliclyReadable(file: NonNullable<FileWithRelations>): boolean {
  const facility = file.facility ?? file.facilityCover
  if (facility?.verificationStatus === PUBLIC_FACILITY_STATUS) return true

  // Sarana menempel pada lapangan induknya — status induk yang menentukan.
  if (file.facilityAmenity?.facility?.verificationStatus === PUBLIC_FACILITY_STATUS) return true

  if (file.coachPhoto?.verificationStatus === PUBLIC_COACH_STATUS) return true
  if (file.officialPhoto?.verificationStatus === PUBLIC_OFFICIAL_STATUS) return true

  return false
}

/**
 * Kabupaten yang berhak atas berkas ini, atau `null` bila tidak dapat
 * ditentukan (mis. berkas yatim yang belum tertaut ke apa pun).
 *
 * Dipakai untuk menegakkan scope admin, bukan untuk keputusan publik.
 */
export function owningDistrictId(file: NonNullable<FileWithRelations>): string | null {
  const player = file.player ?? file.playerPhoto
  if (player) return player.districtId

  const facility = file.facility ?? file.facilityCover
  if (facility) return facility.districtId

  // Sarana: ikut lapangan induk; bila belum tertaut, ikut pengajuannya.
  if (file.facilityAmenity) {
    return file.facilityAmenity.facility?.districtId
      ?? file.facilityAmenity.facilitySubmission?.form.districtId
      ?? null
  }

  if (file.coachPhoto) return file.coachPhoto.districtId
  if (file.officialPhoto) return file.officialPhoto.districtId

  // Pengajuan yang belum menghasilkan master: kabupaten pemilik formnya.
  return file.submission?.form.districtId
    ?? file.facilitySubmission?.form.districtId
    ?? file.facilitySubmissionCover?.form.districtId
    ?? file.coachSubmissionPhoto?.form.districtId
    ?? file.officialSubmissionPhoto?.form.districtId
    ?? null
}
