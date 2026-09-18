import { z } from 'zod'

// Nilai enum harus persis sama dengan backend (officials.schema.ts).
export const officialGenderSchema = z.enum(['LAKI_LAKI', 'PEREMPUAN'])
export const officialStatusSchema = z.enum(['AKTIF', 'TIDAK_AKTIF'])
export const officialRoleSchema = z.enum(['CHAIR_UMPIRE', 'LINE_UMPIRE', 'REFEREE', 'CHIEF_UMPIRE'])
export const officialLevelSchema = z.enum(['DAERAH', 'PROVINSI', 'NASIONAL', 'INTERNASIONAL'])
export const tournamentLevelSchema = z.enum(['KABUPATEN_KOTA', 'PROVINSI', 'NASIONAL', 'INTERNASIONAL'])
export const officialVerificationStatusSchema = z.enum(['MENUNGGU', 'TERVERIFIKASI', 'DITOLAK'])

export type OfficialGender = z.infer<typeof officialGenderSchema>
export type OfficialStatus = z.infer<typeof officialStatusSchema>
export type OfficialRole = z.infer<typeof officialRoleSchema>
export type OfficialLevel = z.infer<typeof officialLevelSchema>
export type TournamentLevel = z.infer<typeof tournamentLevelSchema>
export type OfficialVerificationStatus = z.infer<typeof officialVerificationStatusSchema>

export const GENDER_OPTIONS: Array<{ value: OfficialGender; label: string }> = [
  { value: 'LAKI_LAKI', label: 'Laki-laki' },
  { value: 'PEREMPUAN', label: 'Perempuan' },
]

export const OFFICIAL_STATUS_OPTIONS: Array<{ value: OfficialStatus; label: string }> = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'TIDAK_AKTIF', label: 'Tidak Aktif' },
]

// §5 — peran kewasitan; satu wasit boleh punya lebih dari satu.
export const OFFICIAL_ROLE_OPTIONS: Array<{ value: OfficialRole; label: string }> = [
  { value: 'CHAIR_UMPIRE', label: 'Chair Umpire' },
  { value: 'LINE_UMPIRE', label: 'Line Umpire' },
  { value: 'REFEREE', label: 'Referee' },
  { value: 'CHIEF_UMPIRE', label: 'Chief Umpire' },
]

// §5 — tingkat kewasitan sebagai pengelompokan internal.
export const OFFICIAL_LEVEL_OPTIONS: Array<{ value: OfficialLevel; label: string }> = [
  { value: 'DAERAH', label: 'Daerah' },
  { value: 'PROVINSI', label: 'Provinsi' },
  { value: 'NASIONAL', label: 'Nasional' },
  { value: 'INTERNASIONAL', label: 'Internasional' },
]

// §7 — tingkat turnamen pada riwayat penugasan.
export const TOURNAMENT_LEVEL_OPTIONS: Array<{ value: TournamentLevel; label: string }> = [
  { value: 'KABUPATEN_KOTA', label: 'Kabupaten/Kota' },
  { value: 'PROVINSI', label: 'Provinsi' },
  { value: 'NASIONAL', label: 'Nasional' },
  { value: 'INTERNASIONAL', label: 'Internasional' },
]

export const OFFICIAL_VERIFICATION_STATUS_OPTIONS: Array<{ value: OfficialVerificationStatus; label: string }> = [
  { value: 'MENUNGGU', label: 'Menunggu' },
  { value: 'TERVERIFIKASI', label: 'Terverifikasi' },
  { value: 'DITOLAK', label: 'Ditolak' },
]

function labelFrom(options: ReadonlyArray<{ value: string; label: string }>) {
  const map = new Map(options.map((option) => [option.value, option.label]))
  return (value?: string | null) => (value ? map.get(value) ?? value : '—')
}

export const genderLabel = labelFrom(GENDER_OPTIONS)
export const officialStatusLabel = labelFrom(OFFICIAL_STATUS_OPTIONS)
export const officialRoleLabel = labelFrom(OFFICIAL_ROLE_OPTIONS)
export const officialLevelLabel = labelFrom(OFFICIAL_LEVEL_OPTIONS)
export const tournamentLevelLabel = labelFrom(TOURNAMENT_LEVEL_OPTIONS)
export const officialVerificationStatusLabel = labelFrom(OFFICIAL_VERIFICATION_STATUS_OPTIONS)

export const officialVerificationStatusClass: Record<string, string> = {
  MENUNGGU: 'bg-amber-500/15 text-amber-700 dark:text-amber-500',
  TERVERIFIKASI: 'bg-green-500/15 text-green-700 dark:text-green-400',
  DITOLAK: 'bg-red-500/15 text-red-700 dark:text-red-400',
}

export const officialStatusClass: Record<string, string> = {
  AKTIF: 'bg-green-500/15 text-green-700 dark:text-green-400',
  TIDAK_AKTIF: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

/** §5 — pengalaman dihitung sistem dari tahun menjadi wasit, bukan diketik. */
export function experienceYears(officiatingSince?: number | null) {
  if (officiatingSince == null) return null
  const years = new Date().getFullYear() - officiatingSince
  return years < 0 ? null : years
}

export function formatExperience(officiatingSince?: number | null) {
  const years = experienceYears(officiatingSince)
  return years == null ? '—' : `${years} tahun`
}

/** §4 — umur dihitung otomatis dari tanggal lahir. */
export function ageFrom(birthDate?: string | null) {
  if (!birthDate) return null
  const born = new Date(birthDate)
  if (Number.isNaN(born.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const monthDiff = today.getMonth() - born.getMonth()
  // Ulang tahun tahun ini belum lewat — kurangi satu.
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age -= 1
  return age < 0 ? null : age
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Nilai untuk <input type="date">; backend mengirim ISO datetime. */
export function dateInputValue(value?: string | null) {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

/** Ringkasan daftar kode menjadi label yang bisa dibaca. */
export function joinLabels(values: string[] | undefined, toLabel: (value: string) => string) {
  return values?.length ? values.map(toLabel).join(', ') : '—'
}

const fileSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  createdAt: z.string().optional(),
})

export const officialCertificateSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string().nullable().optional(),
  issuer: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  sortOrder: z.number().optional(),
  fileId: z.string().nullable().optional(),
  file: fileSchema.nullable().optional(),
})
export type OfficialCertificate = z.infer<typeof officialCertificateSchema>

export const officialTournamentSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.number().nullable().optional(),
  level: tournamentLevelSchema.nullable().optional(),
  role: officialRoleSchema.nullable().optional(),
  location: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
})
export type OfficialTournament = z.infer<typeof officialTournamentSchema>

export const officialSchema = z.object({
  id: z.string(),
  officialCode: z.string(),
  fullName: z.string(),
  nik: z.string(),
  gender: officialGenderSchema,
  roles: officialRoleSchema.array().default([]),
  level: officialLevelSchema.nullable().optional(),
  officiatingSince: z.number(),
  officialStatus: officialStatusSchema,
  verificationStatus: officialVerificationStatusSchema,
  acceptingAssignments: z.boolean().optional(),
  photoId: z.string().nullable().optional(),
  district: z.object({ id: z.string().optional(), name: z.string(), code: z.string() }),
  // §5 — jumlah turnamen selalu datang dari hitungan server.
  _count: z.object({ certificates: z.number().optional(), tournaments: z.number() }).optional(),
})
export type Official = z.infer<typeof officialSchema>

export const officialDetailSchema = officialSchema.extend({
  birthDate: z.string(),
  address: z.string(),
  whatsapp: z.string(),
  email: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  experience: z.string().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  verifiedAt: z.string().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  verifier: z.object({ name: z.string(), email: z.string() }).nullable().optional(),
  photo: fileSchema.nullable().optional(),
  certificates: officialCertificateSchema.array().default([]),
  tournaments: officialTournamentSchema.array().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type OfficialDetail = z.infer<typeof officialDetailSchema>

export const officialSubmissionSchema = z.object({
  id: z.string(),
  status: z.string(),
  fullName: z.string(),
  nik: z.string(),
  gender: officialGenderSchema,
  roles: officialRoleSchema.array().default([]),
  level: officialLevelSchema.nullable().optional(),
  officiatingSince: z.number(),
  officialStatus: officialStatusSchema,
  photoId: z.string().nullable().optional(),
  createdAt: z.string(),
  _count: z.object({ certificates: z.number().optional(), tournaments: z.number() }).optional(),
  form: z.object({ title: z.string(), district: z.object({ name: z.string() }) }).optional(),
})
export type OfficialSubmission = z.infer<typeof officialSubmissionSchema>

export const officialSubmissionDetailSchema = officialSubmissionSchema.extend({
  birthDate: z.string(),
  address: z.string(),
  whatsapp: z.string(),
  email: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  acceptingAssignments: z.boolean().optional(),
  experience: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  photo: fileSchema.nullable().optional(),
  certificates: officialCertificateSchema.array().default([]),
  tournaments: officialTournamentSchema.array().default([]),
  // §16 — terisi bila NIK sudah dipakai master wasit lain.
  duplicateOfOfficial: z
    .object({ id: z.string(), officialCode: z.string(), fullName: z.string() })
    .nullable()
    .optional(),
  form: z
    .object({ title: z.string(), district: z.object({ id: z.string().optional(), name: z.string(), code: z.string() }) })
    .optional(),
})
export type OfficialSubmissionDetail = z.infer<typeof officialSubmissionDetailSchema>

export const officialStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  inactive: z.number(),
  byDistrict: z
    .object({ districtId: z.string(), name: z.string(), code: z.string(), total: z.number() })
    .array()
    .default([]),
})
export type OfficialStats = z.infer<typeof officialStatsSchema>

/** Satu lisensi dalam form input — berkas opsional. */
export type OfficialCertificateInput = {
  /** Terisi hanya saat menyunting sertifikat yang sudah tersimpan. */
  id?: string
  name: string
  level?: string
  issuer?: string
  year?: number
  fileId?: string
}

/** Satu riwayat turnamen dalam form input. */
export type OfficialTournamentInput = {
  /** Terisi hanya saat menyunting riwayat yang sudah tersimpan. */
  id?: string
  name: string
  year?: number
  level?: TournamentLevel
  role?: OfficialRole
  location?: string
}

/** Payload pendataan wasit — dipakai form publik maupun input admin. */
export type OfficialFormInput = {
  fullName: string
  nik: string
  gender: OfficialGender
  birthDate: string
  address: string
  photoId?: string
  officialStatus: OfficialStatus
  officiatingSince?: number
  roles: OfficialRole[]
  level?: OfficialLevel
  certificates: OfficialCertificateInput[]
  tournaments: OfficialTournamentInput[]
  whatsapp: string
  email?: string
  instagram?: string
  acceptingAssignments: boolean
  experience?: string
}
