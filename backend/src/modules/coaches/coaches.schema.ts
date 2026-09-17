import { z } from 'zod'

/**
 * Master Data Pelatih §6 — kategori atlet & spesialisasi disimpan sebagai kode
 * enum agar label bisa berubah di UI tanpa migrasi data.
 */
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

export const coachGenderSchema = z.enum(['LAKI_LAKI', 'PEREMPUAN'])
export const coachStatusSchema = z.enum(['AKTIF', 'TIDAK_AKTIF'])
export const coachVerificationStatusSchema = z.enum(['MENUNGGU', 'TERVERIFIKASI', 'DITOLAK'])

/** §17 — NIK 16 digit, dipakai sebagai identitas internal dan harus unik. */
const nikSchema = z
  .string()
  .trim()
  .regex(/^\d{16}$/, 'NIK harus 16 digit angka')

/** Tahun yang masuk akal untuk "mulai melatih" maupun "tahun sertifikat". */
const YEAR_MIN = 1950
const yearSchema = z.coerce
  .number()
  .int()
  .min(YEAR_MIN, `Tahun minimal ${YEAR_MIN}`)
  // Batas atas dihitung saat validasi, bukan dipatok konstanta, agar tidak
  // basi saat tahun berganti.
  .max(new Date().getFullYear() + 1, 'Tahun tidak boleh melebihi tahun depan')

/** Maksimal sertifikat per pelatih — satu pelatih boleh punya banyak (§7). */
export const MAX_COACH_CERTIFICATES = 20

export const coachCertificateInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama lisensi / sertifikat wajib diisi').max(200),
    level: z.string().trim().max(100).optional(),
    issuer: z.string().trim().max(200).optional(),
    year: yearSchema.optional(),
    fileId: z.string().uuid().optional(),
  })
  .strict()

export type CoachCertificateInput = z.infer<typeof coachCertificateInputSchema>

const coachFieldsSchema = z.object({
  // §5 Informasi Pribadi
  fullName: z.string().trim().min(1, 'Nama lengkap wajib diisi').max(200),
  nik: nikSchema,
  gender: coachGenderSchema,
  birthDate: z.coerce.date({ errorMap: () => ({ message: 'Tanggal lahir wajib diisi' }) }),
  address: z.string().trim().min(1, 'Alamat lengkap wajib diisi').max(1000),
  photoId: z.string().uuid().optional(),

  // §6 Informasi Kepelatihan
  coachStatus: coachStatusSchema.default('AKTIF'),
  coachingSince: yearSchema.optional(),
  clubName: z.string().trim().max(200).optional(),
  athleteCategories: athleteCategorySchema.array().max(3).default([]),
  activeAthletes: z.coerce.number().int().min(0).max(10_000).optional(),
  specializations: specializationSchema.array().max(7).default([]),
  otherSpecialization: z.string().trim().max(200).optional(),

  // §7 Lisensi & Sertifikasi
  certificates: coachCertificateInputSchema.array().max(MAX_COACH_CERTIFICATES).default([]),

  // §8 Kontak Pelatih
  whatsapp: z.string().trim().min(1, 'Nomor HP / WhatsApp wajib diisi').max(50),
  email: z.union([z.string().trim().email('Format email tidak valid').max(200), z.literal('')]).optional(),
  instagram: z.string().trim().max(100).optional(),
  acceptingNewAthletes: z.coerce.boolean().default(false),

  // §9 Informasi Tambahan
  experience: z.string().trim().max(4000).optional(),
})

/** §6 — daftar kategori/spesialisasi tidak boleh memuat nilai ganda. */
function refineUniqueList(values: string[], ctx: z.RefinementCtx, path: string) {
  const seen = new Set<string>()
  values.forEach((value, index) => {
    if (seen.has(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path, index], message: 'Pilihan ini sudah dipilih' })
    }
    seen.add(value)
  })
}

// Aturan lintas-field dipakai ulang oleh varian publik maupun admin.
function refineCoachFields(
  value: {
    athleteCategories: string[]
    specializations: string[]
    otherSpecialization?: string
    birthDate: Date
    coachingSince?: number
  },
  ctx: z.RefinementCtx,
) {
  refineUniqueList(value.athleteCategories, ctx, 'athleteCategories')
  refineUniqueList(value.specializations, ctx, 'specializations')

  // §6 — "Lainnya" tanpa keterangan tidak membawa informasi apa pun.
  if (value.specializations.includes('LAINNYA') && !value.otherSpecialization) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['otherSpecialization'],
      message: 'Sebutkan spesialisasi lainnya',
    })
  }

  // Tanggal lahir di masa depan pasti salah ketik.
  if (value.birthDate.getTime() > Date.now()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['birthDate'], message: 'Tanggal lahir tidak boleh di masa depan' })
  }

  // Mulai melatih sebelum lahir tidak mungkin — cek murah yang menangkap
  // tahun salah ketik seperti 1015.
  if (value.coachingSince != null && value.coachingSince < value.birthDate.getFullYear()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['coachingSince'],
      message: 'Tahun mulai melatih tidak boleh sebelum tahun lahir',
    })
  }
}

export const publicCoachSubmissionSchema = coachFieldsSchema
  .extend({ formToken: z.string().trim().min(1, 'Form token is required') })
  .strict()
  .superRefine(refineCoachFields)

// Admin direct entry — district diambil dari token admin atau workspace pusat.
export const adminCoachSubmissionSchema = coachFieldsSchema
  .extend({ districtId: z.string().uuid().optional() })
  .strict()
  .superRefine(refineCoachFields)

export type CoachFieldsInput = z.infer<typeof coachFieldsSchema>
export type PublicCoachSubmissionInput = z.infer<typeof publicCoachSubmissionSchema>
export type AdminCoachSubmissionInput = z.infer<typeof adminCoachSubmissionSchema>

export const reviewCoachSubmissionSchema = z
  .object({
    action: z.enum(['LINK', 'REJECT']),
    rejectionReason: z.string().trim().max(1000).optional(),
    // §10 — status verifikasi & catatan ditetapkan admin saat menyetujui
    verificationStatus: coachVerificationStatusSchema.default('TERVERIFIKASI'),
    adminNotes: z.string().trim().max(2000).optional(),
    districtId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.action === 'REJECT' && !value.rejectionReason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rejectionReason'], message: 'Alasan penolakan wajib diisi' })
    }
  })

export type ReviewCoachSubmissionInput = z.infer<typeof reviewCoachSubmissionSchema>

// Master edit — semua field opsional; sertifikat dikelola lewat endpoint sendiri.
export const updateCoachSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    nik: nikSchema.optional(),
    gender: coachGenderSchema.optional(),
    birthDate: z.coerce.date().optional(),
    address: z.string().trim().min(1).max(1000).optional(),
    photoId: z.string().uuid().nullable().optional(),
    coachStatus: coachStatusSchema.optional(),
    coachingSince: yearSchema.nullable().optional(),
    clubName: z.string().trim().max(200).nullable().optional(),
    athleteCategories: athleteCategorySchema.array().max(3).optional(),
    activeAthletes: z.coerce.number().int().min(0).max(10_000).nullable().optional(),
    specializations: specializationSchema.array().max(7).optional(),
    otherSpecialization: z.string().trim().max(200).nullable().optional(),
    whatsapp: z.string().trim().min(1).max(50).optional(),
    email: z.union([z.string().trim().email().max(200), z.literal('')]).nullable().optional(),
    instagram: z.string().trim().max(100).nullable().optional(),
    acceptingNewAthletes: z.coerce.boolean().optional(),
    experience: z.string().trim().max(4000).nullable().optional(),
    districtId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.athleteCategories) refineUniqueList(value.athleteCategories, ctx, 'athleteCategories')
    if (value.specializations) {
      refineUniqueList(value.specializations, ctx, 'specializations')
      // Keterangan "Lainnya" hanya wajib bila daftar spesialisasi ikut dikirim;
      // nilai lama di DB divalidasi ulang di service.
      if (value.specializations.includes('LAINNYA') && value.otherSpecialization === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['otherSpecialization'], message: 'Sebutkan spesialisasi lainnya' })
      }
    }
    if (value.birthDate && value.birthDate.getTime() > Date.now()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['birthDate'], message: 'Tanggal lahir tidak boleh di masa depan' })
    }
  })

export type UpdateCoachInput = z.infer<typeof updateCoachSchema>

// §10 — panel verifikasi terpisah dari edit data pelatih
export const verifyCoachSchema = z
  .object({
    verificationStatus: coachVerificationStatusSchema,
    adminNotes: z.string().trim().max(2000).nullable().optional(),
    districtId: z.string().uuid().optional(),
  })
  .strict()

export type VerifyCoachInput = z.infer<typeof verifyCoachSchema>

export const coachIdSchema = z.object({ id: z.string().uuid() })

export const coachCertificateParamsSchema = z.object({
  id: z.string().uuid(),
  certificateId: z.string().uuid(),
})

// ── §7 Sertifikat pada master pelatih ────────────────────────────
// Ditulis lewat "replace seluruh daftar" agar UI cukup mengirim keadaan akhir;
// baris lama yang tidak lagi disebut akan dihapus beserta berkasnya.
export const replaceCoachCertificatesSchema = z
  .object({
    certificates: coachCertificateInputSchema
      .extend({ id: z.string().uuid().optional() })
      .array()
      .max(MAX_COACH_CERTIFICATES),
  })
  .strict()

export type ReplaceCoachCertificatesInput = z.infer<typeof replaceCoachCertificatesSchema>

export const coachListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    districtId: z.string().uuid().optional(),
    q: z.string().trim().max(200).optional(),
    verificationStatus: coachVerificationStatusSchema.optional(),
    coachStatus: coachStatusSchema.optional(),
    athleteCategory: athleteCategorySchema.optional(),
  })
  .strict()

export const coachSubmissionListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    districtId: z.string().uuid().optional(),
    q: z.string().trim().max(200).optional(),
  })
  .strict()

export const coachDetailQuerySchema = z.object({ districtId: z.string().uuid().optional() }).strict()

export type CoachListQuery = z.infer<typeof coachListQuerySchema>
