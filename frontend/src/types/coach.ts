import { z } from 'zod'

// Nilai enum harus persis sama dengan backend (coaches.schema.ts).
export const coachGenderSchema = z.enum(['LAKI_LAKI', 'PEREMPUAN'])
export const coachStatusSchema = z.enum(['AKTIF', 'TIDAK_AKTIF'])
export const athleteCategorySchema = z.enum(['JUNIOR', 'SENIOR', 'SEMUA_UMUR'])
export const specializationSchema = z.enum([
  'TEKNIK',
  'FISIK',
  'TAKTIK',
  'PERFORMANCE',
  'FUNDAMENTAL',
  'UMUM',
  'LAINNYA',
])
export const coachVerificationStatusSchema = z.enum(['MENUNGGU', 'TERVERIFIKASI', 'DITOLAK'])

export type CoachGender = z.infer<typeof coachGenderSchema>
export type CoachStatus = z.infer<typeof coachStatusSchema>
export type AthleteCategory = z.infer<typeof athleteCategorySchema>
export type CoachSpecialization = z.infer<typeof specializationSchema>
export type CoachVerificationStatus = z.infer<typeof coachVerificationStatusSchema>

export const GENDER_OPTIONS: Array<{ value: CoachGender; label: string }> = [
  { value: 'LAKI_LAKI', label: 'Laki-laki' },
  { value: 'PEREMPUAN', label: 'Perempuan' },
]

export const COACH_STATUS_OPTIONS: Array<{ value: CoachStatus; label: string }> = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'TIDAK_AKTIF', label: 'Tidak Aktif' },
]

// §6 — kategori atlet yang biasa dilatih; boleh lebih dari satu.
export const ATHLETE_CATEGORY_OPTIONS: Array<{ value: AthleteCategory; label: string }> = [
  { value: 'JUNIOR', label: 'Junior' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'SEMUA_UMUR', label: 'Semua Umur' },
]

// §6 — spesialisasi kepelatihan; "Lainnya" memunculkan kolom keterangan.
export const SPECIALIZATION_OPTIONS: Array<{ value: CoachSpecialization; label: string }> = [
  { value: 'TEKNIK', label: 'Teknik' },
  { value: 'FISIK', label: 'Fisik' },
  { value: 'TAKTIK', label: 'Taktik' },
  { value: 'PERFORMANCE', label: 'Performance' },
  { value: 'FUNDAMENTAL', label: 'Fundamental' },
  { value: 'UMUM', label: 'Umum' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

export const COACH_VERIFICATION_STATUS_OPTIONS: Array<{ value: CoachVerificationStatus; label: string }> = [
  { value: 'MENUNGGU', label: 'Menunggu' },
  { value: 'TERVERIFIKASI', label: 'Terverifikasi' },
  { value: 'DITOLAK', label: 'Ditolak' },
]

function labelFrom(options: ReadonlyArray<{ value: string; label: string }>) {
  const map = new Map(options.map((option) => [option.value, option.label]))
  return (value?: string | null) => (value ? map.get(value) ?? value : '—')
}

export const genderLabel = labelFrom(GENDER_OPTIONS)
export const coachStatusLabel = labelFrom(COACH_STATUS_OPTIONS)
export const athleteCategoryLabel = labelFrom(ATHLETE_CATEGORY_OPTIONS)
export const specializationLabel = labelFrom(SPECIALIZATION_OPTIONS)
export const coachVerificationStatusLabel = labelFrom(COACH_VERIFICATION_STATUS_OPTIONS)

export const coachVerificationStatusClass: Record<string, string> = {
  MENUNGGU: 'bg-amber-500/15 text-amber-700 dark:text-amber-500',
  TERVERIFIKASI: 'bg-green-500/15 text-green-700 dark:text-green-400',
  DITOLAK: 'bg-red-500/15 text-red-700 dark:text-red-400',
}

export const coachStatusClass: Record<string, string> = {
  AKTIF: 'bg-green-500/15 text-green-700 dark:text-green-400',
  TIDAK_AKTIF: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

/** §6 — pengalaman dihitung sistem dari tahun mulai melatih, bukan diketik. */
export function experienceYears(coachingSince?: number | null) {
  if (coachingSince == null) return null
  const years = new Date().getFullYear() - coachingSince
  return years < 0 ? null : years
}

export function formatExperience(coachingSince?: number | null) {
  const years = experienceYears(coachingSince)
  return years == null ? '—' : `${years} tahun`
}

/** §5 — umur dihitung otomatis dari tanggal lahir. */
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
export type CoachFile = z.infer<typeof fileSchema>

/** Berkas non-gambar (PDF) tidak bisa ditampilkan sebagai <img>. */
export function isImageFile(file?: { mimeType?: string | null } | null) {
  return Boolean(file?.mimeType?.startsWith('image/'))
}

export const coachCertificateSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string().nullable().optional(),
  issuer: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  sortOrder: z.number().optional(),
  fileId: z.string().nullable().optional(),
  file: fileSchema.nullable().optional(),
})
export type CoachCertificate = z.infer<typeof coachCertificateSchema>

export const coachSchema = z.object({
  id: z.string(),
  coachCode: z.string(),
  fullName: z.string(),
  nik: z.string(),
  gender: coachGenderSchema,
  clubName: z.string().nullable().optional(),
  coachingSince: z.number().nullable().optional(),
  activeAthletes: z.number().nullable().optional(),
  athleteCategories: athleteCategorySchema.array().default([]),
  specializations: specializationSchema.array().default([]),
  coachStatus: coachStatusSchema,
  verificationStatus: coachVerificationStatusSchema,
  acceptingNewAthletes: z.boolean().optional(),
  photoId: z.string().nullable().optional(),
  district: z.object({ id: z.string().optional(), name: z.string(), code: z.string() }),
  _count: z.object({ certificates: z.number() }).optional(),
})
export type Coach = z.infer<typeof coachSchema>

export const coachDetailSchema = coachSchema.extend({
  birthDate: z.string(),
  address: z.string(),
  otherSpecialization: z.string().nullable().optional(),
  whatsapp: z.string(),
  email: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  experience: z.string().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  verifiedAt: z.string().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  verifier: z.object({ name: z.string(), email: z.string() }).nullable().optional(),
  photo: fileSchema.nullable().optional(),
  certificates: coachCertificateSchema.array().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type CoachDetail = z.infer<typeof coachDetailSchema>

export const coachSubmissionSchema = z.object({
  id: z.string(),
  status: z.string(),
  fullName: z.string(),
  nik: z.string(),
  gender: coachGenderSchema,
  clubName: z.string().nullable().optional(),
  coachingSince: z.number().nullable().optional(),
  activeAthletes: z.number().nullable().optional(),
  coachStatus: coachStatusSchema,
  photoId: z.string().nullable().optional(),
  createdAt: z.string(),
  _count: z.object({ certificates: z.number() }).optional(),
  form: z.object({ title: z.string(), district: z.object({ name: z.string() }) }).optional(),
})
export type CoachSubmission = z.infer<typeof coachSubmissionSchema>

export const coachSubmissionDetailSchema = coachSubmissionSchema.extend({
  birthDate: z.string(),
  address: z.string(),
  athleteCategories: athleteCategorySchema.array().default([]),
  specializations: specializationSchema.array().default([]),
  otherSpecialization: z.string().nullable().optional(),
  whatsapp: z.string(),
  email: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  acceptingNewAthletes: z.boolean().optional(),
  experience: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  photo: fileSchema.nullable().optional(),
  certificates: coachCertificateSchema.array().default([]),
  // §17 — terisi bila NIK sudah dipakai master pelatih lain.
  duplicateOfCoach: z
    .object({ id: z.string(), coachCode: z.string(), fullName: z.string() })
    .nullable()
    .optional(),
  form: z
    .object({ title: z.string(), district: z.object({ id: z.string().optional(), name: z.string(), code: z.string() }) })
    .optional(),
})
export type CoachSubmissionDetail = z.infer<typeof coachSubmissionDetailSchema>

export const coachStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  inactive: z.number(),
  byDistrict: z
    .object({ districtId: z.string(), name: z.string(), code: z.string(), total: z.number() })
    .array()
    .default([]),
})
export type CoachStats = z.infer<typeof coachStatsSchema>

/** Satu lisensi dalam form input — berkas opsional. */
export type CoachCertificateInput = {
  /** Terisi hanya saat menyunting sertifikat yang sudah tersimpan. */
  id?: string
  name: string
  level?: string
  issuer?: string
  year?: number
  fileId?: string
}

/** Payload pendataan pelatih — dipakai form publik maupun input admin. */
export type CoachFormInput = {
  fullName: string
  nik: string
  gender: CoachGender
  birthDate: string
  address: string
  photoId?: string
  coachStatus: CoachStatus
  coachingSince?: number
  clubName?: string
  athleteCategories: AthleteCategory[]
  activeAthletes?: number
  specializations: CoachSpecialization[]
  otherSpecialization?: string
  certificates: CoachCertificateInput[]
  whatsapp: string
  email?: string
  instagram?: string
  acceptingNewAthletes: boolean
  experience?: string
}
