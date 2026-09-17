import { z } from 'zod'

// Nilai enum harus persis sama dengan backend (facilities.schema.ts).
export const courtTypeSchema = z.enum(['OUTDOOR', 'INDOOR', 'SEMI_INDOOR'])
export const surfaceSchema = z.enum(['HARD_COURT', 'CLAY', 'GRASS', 'SYNTHETIC'])
export const surfaceConditionSchema = z.enum(['BAIK', 'CUKUP', 'PERLU_PERBAIKAN'])
export const netConditionSchema = z.enum(['BAIK', 'CUKUP', 'RUSAK'])
export const operationalStatusSchema = z.enum(['AKTIF', 'RENOVASI', 'TIDAK_AKTIF'])
export const accessTypeSchema = z.enum(['UMUM', 'ANGGOTA', 'KHUSUS'])
export const verificationStatusSchema = z.enum(['MENUNGGU', 'TERVERIFIKASI', 'DITOLAK'])
export const gradeSchema = z.enum(['A', 'B', 'C'])

export type CourtType = z.infer<typeof courtTypeSchema>
export type Surface = z.infer<typeof surfaceSchema>
export type SurfaceCondition = z.infer<typeof surfaceConditionSchema>
export type NetCondition = z.infer<typeof netConditionSchema>
export type FacilityOperationalStatus = z.infer<typeof operationalStatusSchema>
export type FacilityAccess = z.infer<typeof accessTypeSchema>
export type FacilityVerificationStatus = z.infer<typeof verificationStatusSchema>
export type FacilityGrade = z.infer<typeof gradeSchema>

// §4 — daftar fasilitas yang bisa dicentang; urutannya mengikuti dokumen.
export const AMENITY_OPTIONS = [
  { value: 'TOILET', label: 'Toilet' },
  { value: 'SHOWER', label: 'Kamar Mandi / Shower' },
  { value: 'RUANG_GANTI', label: 'Ruang Ganti' },
  { value: 'TRIBUN', label: 'Tribun Penonton' },
  { value: 'KANTIN', label: 'Kantin / Cafe' },
  { value: 'PARKIR', label: 'Area Parkir' },
  { value: 'TEMPAT_IBADAH', label: 'Tempat Ibadah' },
  { value: 'RUANG_TUNGGU', label: 'Ruang Tunggu' },
  { value: 'WIFI', label: 'Wi-Fi' },
  { value: 'PAPAN_SKOR', label: 'Papan Skor' },
  { value: 'KURSI_WASIT', label: 'Kursi Wasit' },
  { value: 'RUANG_PEMAIN', label: 'Ruang Pemain' },
  { value: 'SECURITY', label: 'Security / Keamanan' },
  { value: 'LAINNYA', label: 'Lainnya' },
] as const

export const COURT_TYPE_OPTIONS: Array<{ value: CourtType; label: string }> = [
  { value: 'OUTDOOR', label: 'Outdoor' },
  { value: 'INDOOR', label: 'Indoor' },
  { value: 'SEMI_INDOOR', label: 'Semi Indoor' },
]

export const SURFACE_OPTIONS: Array<{ value: Surface; label: string }> = [
  { value: 'HARD_COURT', label: 'Hard Court' },
  { value: 'CLAY', label: 'Clay' },
  { value: 'GRASS', label: 'Grass' },
  { value: 'SYNTHETIC', label: 'Synthetic' },
]

export const SURFACE_CONDITION_OPTIONS: Array<{ value: SurfaceCondition; label: string }> = [
  { value: 'BAIK', label: 'Baik' },
  { value: 'CUKUP', label: 'Cukup' },
  { value: 'PERLU_PERBAIKAN', label: 'Perlu Perbaikan' },
]

export const NET_CONDITION_OPTIONS: Array<{ value: NetCondition; label: string }> = [
  { value: 'BAIK', label: 'Baik' },
  { value: 'CUKUP', label: 'Cukup' },
  { value: 'RUSAK', label: 'Rusak' },
]

export const OPERATIONAL_STATUS_OPTIONS: Array<{ value: FacilityOperationalStatus; label: string }> = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'RENOVASI', label: 'Renovasi' },
  { value: 'TIDAK_AKTIF', label: 'Tidak Aktif' },
]

export const ACCESS_OPTIONS: Array<{ value: FacilityAccess; label: string }> = [
  { value: 'UMUM', label: 'Umum' },
  { value: 'ANGGOTA', label: 'Anggota' },
  { value: 'KHUSUS', label: 'Khusus' },
]

export const VERIFICATION_STATUS_OPTIONS: Array<{ value: FacilityVerificationStatus; label: string }> = [
  { value: 'MENUNGGU', label: 'Menunggu' },
  { value: 'TERVERIFIKASI', label: 'Terverifikasi' },
  { value: 'DITOLAK', label: 'Ditolak' },
]

function labelFrom(options: ReadonlyArray<{ value: string; label: string }>) {
  const map = new Map(options.map((option) => [option.value, option.label]))
  return (value?: string | null) => (value ? map.get(value) ?? value : '—')
}

export const courtTypeLabel = labelFrom(COURT_TYPE_OPTIONS)
export const surfaceLabel = labelFrom(SURFACE_OPTIONS)
export const surfaceConditionLabel = labelFrom(SURFACE_CONDITION_OPTIONS)
export const netConditionLabel = labelFrom(NET_CONDITION_OPTIONS)
export const operationalStatusLabel = labelFrom(OPERATIONAL_STATUS_OPTIONS)
export const accessLabel = labelFrom(ACCESS_OPTIONS)
export const verificationStatusLabel = labelFrom(VERIFICATION_STATUS_OPTIONS)
export const amenityLabel = labelFrom(AMENITY_OPTIONS)

export const verificationStatusClass: Record<string, string> = {
  MENUNGGU: 'bg-amber-500/15 text-amber-700 dark:text-amber-500',
  TERVERIFIKASI: 'bg-green-500/15 text-green-700 dark:text-green-400',
  DITOLAK: 'bg-red-500/15 text-red-700 dark:text-red-400',
}

export const operationalStatusClass: Record<string, string> = {
  AKTIF: 'bg-green-500/15 text-green-700 dark:text-green-400',
  RENOVASI: 'bg-amber-500/15 text-amber-700 dark:text-amber-500',
  TIDAK_AKTIF: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

export function formatRupiah(value?: number | null) {
  if (value == null) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

export function formatMeters(value?: number | null) {
  return value == null ? '—' : `${new Intl.NumberFormat('id-ID').format(value)} m`
}

export function formatOperatingHours(openTime?: string | null, closeTime?: string | null) {
  if (!openTime && !closeTime) return '—'
  return `${openTime ?? '—'} - ${closeTime ?? '—'}`
}

const photoSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  createdAt: z.string().optional(),
})

/** Maksimal foto per sarana — harus sama dengan MAX_AMENITY_PHOTOS di backend. */
export const MAX_AMENITY_PHOTOS = 5

export const facilityAmenitySchema = z.object({
  id: z.string(),
  code: z.string(),
  customName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  photos: photoSchema.array().optional(),
})
export type FacilityAmenity = z.infer<typeof facilityAmenitySchema>

/** Nama tampil satu sarana — "Lainnya" memakai nama yang diketik pengisi. */
export function amenityDisplayName(amenity: { code: string; customName?: string | null }) {
  return amenity.code === 'LAINNYA' ? amenity.customName || 'Fasilitas lainnya' : amenityLabel(amenity.code)
}

export const facilitySchema = z.object({
  id: z.string(),
  facilityCode: z.string(),
  name: z.string(),
  address: z.string(),
  courtCount: z.number(),
  courtType: courtTypeSchema,
  surface: surfaceSchema,
  operationalStatus: operationalStatusSchema,
  verificationStatus: verificationStatusSchema,
  grade: gradeSchema.nullable().optional(),
  coverPhotoId: z.string().nullable().optional(),
  district: z.object({ id: z.string().optional(), name: z.string(), code: z.string() }),
  _count: z.object({ photos: z.number() }).optional(),
})
export type Facility = z.infer<typeof facilitySchema>

export const facilityDetailSchema = facilitySchema.extend({
  mapsUrl: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  courtLength: z.number().nullable().optional(),
  courtWidth: z.number().nullable().optional(),
  clearanceBack: z.number().nullable().optional(),
  clearanceLeft: z.number().nullable().optional(),
  clearanceRight: z.number().nullable().optional(),
  surfaceCondition: surfaceConditionSchema,
  hasLighting: z.boolean(),
  lightCount: z.number().nullable().optional(),
  netCondition: netConditionSchema,
  amenities: facilityAmenitySchema.array().default([]),
  managerName: z.string().nullable().optional(),
  picName: z.string().nullable().optional(),
  picPhone: z.string().nullable().optional(),
  openTime: z.string().nullable().optional(),
  closeTime: z.string().nullable().optional(),
  accessType: accessTypeSchema,
  hourlyRate: z.number().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  verifiedAt: z.string().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  verifier: z.object({ name: z.string(), email: z.string() }).nullable().optional(),
  photos: photoSchema.array().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type FacilityDetail = z.infer<typeof facilityDetailSchema>

export const facilityStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  renovation: z.number(),
  inactive: z.number(),
  /** Total court seluruh lapangan — kapasitas, bukan jumlah venue. */
  courts: z.number(),
  byDistrict: z
    .object({ districtId: z.string(), name: z.string(), code: z.string(), total: z.number() })
    .array()
    .default([]),
})
export type FacilityStats = z.infer<typeof facilityStatsSchema>

export const facilitySubmissionSchema = z.object({
  id: z.string(),
  status: z.string(),
  name: z.string(),
  address: z.string(),
  courtCount: z.number(),
  courtType: courtTypeSchema,
  surface: surfaceSchema,
  operationalStatus: operationalStatusSchema,
  coverPhotoId: z.string().nullable().optional(),
  createdAt: z.string(),
  _count: z.object({ photos: z.number() }).optional(),
  form: z.object({ title: z.string(), district: z.object({ name: z.string() }) }).optional(),
})
export type FacilitySubmission = z.infer<typeof facilitySubmissionSchema>

export const facilitySubmissionDetailSchema = facilitySubmissionSchema.extend({
  mapsUrl: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  courtLength: z.number().nullable().optional(),
  courtWidth: z.number().nullable().optional(),
  clearanceBack: z.number().nullable().optional(),
  clearanceLeft: z.number().nullable().optional(),
  clearanceRight: z.number().nullable().optional(),
  surfaceCondition: surfaceConditionSchema,
  hasLighting: z.boolean(),
  lightCount: z.number().nullable().optional(),
  netCondition: netConditionSchema,
  amenities: facilityAmenitySchema.array().default([]),
  managerName: z.string().nullable().optional(),
  picName: z.string().nullable().optional(),
  picPhone: z.string().nullable().optional(),
  openTime: z.string().nullable().optional(),
  closeTime: z.string().nullable().optional(),
  accessType: accessTypeSchema,
  hourlyRate: z.number().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  photos: photoSchema.array().optional(),
  form: z
    .object({ title: z.string(), district: z.object({ id: z.string().optional(), name: z.string(), code: z.string() }) })
    .optional(),
})
export type FacilitySubmissionDetail = z.infer<typeof facilitySubmissionDetailSchema>

/** Satu sarana dalam form input — foto & deskripsi opsional. */
export type FacilityAmenityInput = {
  /** Terisi hanya saat menyunting sarana yang sudah tersimpan. */
  id?: string
  code: string
  customName?: string
  description?: string
  photoIds: string[]
}

/** Payload pengisian lapangan — dipakai form publik maupun input admin. */
export type FacilityFormInput = {
  name: string
  address: string
  mapsUrl?: string
  description?: string
  courtCount: number
  courtType: CourtType
  surface: Surface
  courtLength?: number
  courtWidth?: number
  clearanceBack?: number
  clearanceLeft?: number
  clearanceRight?: number
  surfaceCondition: SurfaceCondition
  hasLighting: boolean
  lightCount?: number
  netCondition: NetCondition
  amenities: FacilityAmenityInput[]
  managerName?: string
  picName?: string
  picPhone?: string
  operationalStatus: FacilityOperationalStatus
  openTime?: string
  closeTime?: string
  accessType: FacilityAccess
  hourlyRate?: number
  photoIds: string[]
  coverPhotoId?: string
}
