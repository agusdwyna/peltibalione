import { z } from 'zod'

/**
 * Master Data Lapangan §4 — allowlist fasilitas. Disimpan sebagai kode agar
 * label bisa berubah di UI tanpa migrasi data.
 */
export const AMENITY_CODES = [
  'TOILET',
  'SHOWER',
  'RUANG_GANTI',
  'TRIBUN',
  'KANTIN',
  'PARKIR',
  'TEMPAT_IBADAH',
  'RUANG_TUNGGU',
  'WIFI',
  'PAPAN_SKOR',
  'KURSI_WASIT',
  'RUANG_PEMAIN',
  'SECURITY',
  'LAINNYA',
] as const

export const amenitySchema = z.enum(AMENITY_CODES)

/** Maksimal foto per sarana — foto dan deskripsi sendiri bersifat opsional. */
export const MAX_AMENITY_PHOTOS = 5

export const facilityAmenityInputSchema = z
  .object({
    code: amenitySchema,
    // Wajib hanya bila code = LAINNYA (fasilitas di luar daftar master).
    customName: z.string().trim().max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    photoIds: z.string().uuid().array().max(MAX_AMENITY_PHOTOS).default([]),
  })
  .strict()

export type FacilityAmenityInput = z.infer<typeof facilityAmenityInputSchema>

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam harus HH:MM')

const optionalMeters = z.coerce.number().positive().max(200).optional()

const facilityFieldsSchema = z.object({
    // §1 Identitas & Lokasi
    name: z.string().trim().min(1, 'Nama lapangan wajib diisi').max(200),
    address: z.string().trim().min(1, 'Alamat wajib diisi').max(1000),
    mapsUrl: z.string().trim().max(2000).optional(),
    description: z.string().trim().max(2000).optional(),

    // §2 Data Teknis
    courtCount: z.coerce.number().int().min(1, 'Jumlah court minimal 1').max(100),
    courtType: z.enum(['OUTDOOR', 'INDOOR', 'SEMI_INDOOR']),
    surface: z.enum(['HARD_COURT', 'CLAY', 'GRASS', 'SYNTHETIC']),
    courtLength: optionalMeters,
    courtWidth: optionalMeters,
    clearanceBack: optionalMeters,
    clearanceLeft: optionalMeters,
    clearanceRight: optionalMeters,
    surfaceCondition: z.enum(['BAIK', 'CUKUP', 'PERLU_PERBAIKAN']),
    hasLighting: z.coerce.boolean().default(false),
    lightCount: z.coerce.number().int().min(0).max(1000).optional(),
    netCondition: z.enum(['BAIK', 'CUKUP', 'RUSAK']),

    // §4 Sarana & Prasarana — tiap fasilitas berdiri sendiri, boleh berdeskripsi
    // dan berfoto. "LAINNYA" boleh muncul lebih dari sekali dengan nama berbeda.
    amenities: facilityAmenityInputSchema.array().max(40).default([]),

    // §5 Pengelola
    managerName: z.string().trim().max(200).optional(),
    picName: z.string().trim().max(200).optional(),
    picPhone: z.string().trim().max(50).optional(),

    // §6 Operasional
    operationalStatus: z.enum(['AKTIF', 'RENOVASI', 'TIDAK_AKTIF']).default('AKTIF'),
    openTime: timeSchema.optional(),
    closeTime: timeSchema.optional(),
    accessType: z.enum(['UMUM', 'ANGGOTA', 'KHUSUS']).default('UMUM'),
    hourlyRate: z.coerce.number().int().min(0).max(100_000_000).optional(),

    // §3 Foto — minimal 1 wajib, 6 dianjurkan (dianjurkan, bukan ditolak server)
    photoIds: z.string().uuid().array().min(1, 'Minimal satu foto lapangan wajib diunggah').max(20),
    coverPhotoId: z.string().uuid().optional(),
})

/** §4 — aturan daftar sarana, dipakai form input maupun endpoint master. */
export function refineAmenityList(amenities: FacilityAmenityInput[], ctx: z.RefinementCtx, basePath: (string | number)[] = ['amenities']) {
  const seen = new Set<string>()
  amenities.forEach((amenity, index) => {
    if (amenity.code === 'LAINNYA') {
      // Fasilitas di luar master tidak berarti apa-apa tanpa nama.
      if (!amenity.customName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...basePath, index, 'customName'], message: 'Sebutkan nama fasilitas lainnya' })
      }
      return
    }
    // Fasilitas master tidak boleh dicentang dua kali.
    if (seen.has(amenity.code)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...basePath, index, 'code'], message: 'Fasilitas ini sudah dipilih' })
    }
    seen.add(amenity.code)
  })
}

// Aturan lintas-field dipakai ulang oleh varian publik maupun admin.
function refineFacilityFields(
  value: {
    hasLighting: boolean
    lightCount?: number
    amenities: FacilityAmenityInput[]
    photoIds: string[]
    coverPhotoId?: string
  },
  ctx: z.RefinementCtx,
) {
  // §2 — jumlah lampu hanya bermakna bila lapangan memang berpenerangan
  if (value.hasLighting && (value.lightCount == null || value.lightCount < 1)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lightCount'], message: 'Jumlah lampu wajib diisi bila lapangan memiliki penerangan' })
  }
  refineAmenityList(value.amenities, ctx)
  // §3 — cover harus salah satu foto yang benar-benar diunggah
  if (value.coverPhotoId && !value.photoIds.includes(value.coverPhotoId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['coverPhotoId'], message: 'Foto utama harus dipilih dari foto yang diunggah' })
  }
}

export const publicFacilitySubmissionSchema = facilityFieldsSchema
  .extend({ formToken: z.string().trim().min(1, 'Form token is required') })
  .strict()
  .superRefine(refineFacilityFields)

// Admin direct entry — district diambil dari token admin atau workspace pusat.
export const adminFacilitySubmissionSchema = facilityFieldsSchema
  .extend({ districtId: z.string().uuid().optional() })
  .strict()
  .superRefine(refineFacilityFields)

export type FacilityFieldsInput = z.infer<typeof facilityFieldsSchema>
export type PublicFacilitySubmissionInput = z.infer<typeof publicFacilitySubmissionSchema>
export type AdminFacilitySubmissionInput = z.infer<typeof adminFacilitySubmissionSchema>

export const reviewFacilitySubmissionSchema = z
  .object({
    action: z.enum(['LINK', 'REJECT']),
    rejectionReason: z.string().trim().max(1000).optional(),
    // §7 — verifikasi & grade ditetapkan admin saat menyetujui
    grade: z.enum(['A', 'B', 'C']).optional(),
    verificationStatus: z.enum(['MENUNGGU', 'TERVERIFIKASI', 'DITOLAK']).default('TERVERIFIKASI'),
    adminNotes: z.string().trim().max(2000).optional(),
    districtId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.action === 'REJECT' && !value.rejectionReason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rejectionReason'], message: 'Alasan penolakan wajib diisi' })
    }
  })

export type ReviewFacilitySubmissionInput = z.infer<typeof reviewFacilitySubmissionSchema>

// Master edit — semua field opsional; foto dikelola lewat endpoint terpisah.
export const updateFacilitySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    address: z.string().trim().min(1).max(1000).optional(),
    mapsUrl: z.string().trim().max(2000).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    courtCount: z.coerce.number().int().min(1).max(100).optional(),
    courtType: z.enum(['OUTDOOR', 'INDOOR', 'SEMI_INDOOR']).optional(),
    surface: z.enum(['HARD_COURT', 'CLAY', 'GRASS', 'SYNTHETIC']).optional(),
    courtLength: z.coerce.number().positive().max(200).nullable().optional(),
    courtWidth: z.coerce.number().positive().max(200).nullable().optional(),
    clearanceBack: z.coerce.number().positive().max(200).nullable().optional(),
    clearanceLeft: z.coerce.number().positive().max(200).nullable().optional(),
    clearanceRight: z.coerce.number().positive().max(200).nullable().optional(),
    surfaceCondition: z.enum(['BAIK', 'CUKUP', 'PERLU_PERBAIKAN']).optional(),
    hasLighting: z.coerce.boolean().optional(),
    lightCount: z.coerce.number().int().min(0).max(1000).nullable().optional(),
    netCondition: z.enum(['BAIK', 'CUKUP', 'RUSAK']).optional(),
    // Sarana punya endpoint sendiri (butuh kelola foto per baris), jadi tidak
    // ikut di sini agar tidak ada dua jalur tulis yang saling bertabrakan.
    managerName: z.string().trim().max(200).nullable().optional(),
    picName: z.string().trim().max(200).nullable().optional(),
    picPhone: z.string().trim().max(50).nullable().optional(),
    operationalStatus: z.enum(['AKTIF', 'RENOVASI', 'TIDAK_AKTIF']).optional(),
    openTime: timeSchema.nullable().optional(),
    closeTime: timeSchema.nullable().optional(),
    accessType: z.enum(['UMUM', 'ANGGOTA', 'KHUSUS']).optional(),
    hourlyRate: z.coerce.number().int().min(0).max(100_000_000).nullable().optional(),
    coverPhotoId: z.string().uuid().nullable().optional(),
    districtId: z.string().uuid().optional(),
  })
  .strict()

export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>

// §7 — panel verifikasi terpisah dari edit data teknis
export const verifyFacilitySchema = z
  .object({
    verificationStatus: z.enum(['MENUNGGU', 'TERVERIFIKASI', 'DITOLAK']).optional(),
    grade: z.enum(['A', 'B', 'C']).nullable().optional(),
    adminNotes: z.string().trim().max(2000).nullable().optional(),
    districtId: z.string().uuid().optional(),
  })
  .strict()

export type VerifyFacilityInput = z.infer<typeof verifyFacilitySchema>

export const facilityIdSchema = z.object({ id: z.string().uuid() })

export const facilityPhotoParamsSchema = z.object({
  id: z.string().uuid(),
  photoId: z.string().uuid(),
})

// ── §4 Sarana pada master lapangan ──────────────────────────────
// Ditulis lewat "replace seluruh daftar" agar UI cukup mengirim keadaan akhir;
// baris lama yang tidak lagi disebut akan dihapus beserta fotonya.
export const replaceFacilityAmenitiesSchema = z
  .object({
    amenities: facilityAmenityInputSchema
      .extend({ id: z.string().uuid().optional() })
      .array()
      .max(40),
  })
  .strict()
  .superRefine((value, ctx) => refineAmenityList(value.amenities, ctx))

export type ReplaceFacilityAmenitiesInput = z.infer<typeof replaceFacilityAmenitiesSchema>

export const facilityAmenityParamsSchema = z.object({
  id: z.string().uuid(),
  amenityId: z.string().uuid(),
})

export const facilityAmenityPhotoParamsSchema = z.object({
  id: z.string().uuid(),
  amenityId: z.string().uuid(),
  photoId: z.string().uuid(),
})

export const attachAmenityPhotosSchema = z
  .object({ photoIds: z.string().uuid().array().min(1).max(MAX_AMENITY_PHOTOS) })
  .strict()

export const facilityListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    districtId: z.string().uuid().optional(),
    q: z.string().trim().max(200).optional(),
    verificationStatus: z.enum(['MENUNGGU', 'TERVERIFIKASI', 'DITOLAK']).optional(),
    grade: z.enum(['A', 'B', 'C']).optional(),
    operationalStatus: z.enum(['AKTIF', 'RENOVASI', 'TIDAK_AKTIF']).optional(),
  })
  .strict()

export const facilitySubmissionListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    districtId: z.string().uuid().optional(),
    q: z.string().trim().max(200).optional(),
  })
  .strict()

export const facilityDetailQuerySchema = z.object({ districtId: z.string().uuid().optional() }).strict()

export type FacilityListQuery = z.infer<typeof facilityListQuerySchema>
