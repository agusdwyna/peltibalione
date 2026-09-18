import { z } from 'zod'

/**
 * Master Data Wasit §5/§7 — peran, tingkat, dan tingkat turnamen disimpan
 * sebagai kode enum agar label bisa berubah di UI tanpa migrasi data.
 */
export const officialRoleSchema = z.enum(['CHAIR_UMPIRE', 'LINE_UMPIRE', 'REFEREE', 'CHIEF_UMPIRE'])
export const officialLevelSchema = z.enum(['DAERAH', 'PROVINSI', 'NASIONAL', 'INTERNASIONAL'])
export const tournamentLevelSchema = z.enum(['KABUPATEN_KOTA', 'PROVINSI', 'NASIONAL', 'INTERNASIONAL'])
export const officialGenderSchema = z.enum(['LAKI_LAKI', 'PEREMPUAN'])
export const officialStatusSchema = z.enum(['AKTIF', 'TIDAK_AKTIF'])
export const officialVerificationStatusSchema = z.enum(['MENUNGGU', 'TERVERIFIKASI', 'DITOLAK'])

/** §16 — NIK 16 digit, identitas internal dan harus unik. */
const nikSchema = z
  .string()
  .trim()
  .regex(/^\d{16}$/, 'NIK harus 16 digit angka')

/** Tahun yang masuk akal untuk "menjadi wasit sejak" maupun tahun sertifikat. */
const YEAR_MIN = 1950
const yearSchema = z.coerce
  .number()
  .int()
  .min(YEAR_MIN, `Tahun minimal ${YEAR_MIN}`)
  // Batas atas dihitung saat validasi, bukan dipatok konstanta, agar tidak
  // basi saat tahun berganti.
  .max(new Date().getFullYear() + 1, 'Tahun tidak boleh melebihi tahun depan')

export const MAX_OFFICIAL_CERTIFICATES = 20
export const MAX_OFFICIAL_TOURNAMENTS = 200

export const officialCertificateInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama lisensi / sertifikat wajib diisi').max(200),
    level: z.string().trim().max(100).optional(),
    issuer: z.string().trim().max(200).optional(),
    year: yearSchema.optional(),
    fileId: z.string().uuid().optional(),
  })
  .strict()

export type OfficialCertificateInput = z.infer<typeof officialCertificateInputSchema>

/** §7 Riwayat Turnamen — sumber angka "Jumlah Turnamen" yang dihitung sistem. */
export const officialTournamentInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama turnamen wajib diisi').max(200),
    year: yearSchema.optional(),
    level: tournamentLevelSchema.optional(),
    role: officialRoleSchema.optional(),
    location: z.string().trim().max(200).optional(),
  })
  .strict()

export type OfficialTournamentInput = z.infer<typeof officialTournamentInputSchema>

const officialFieldsSchema = z.object({
  // §4 Informasi Pribadi — foto profil wajib (§16)
  fullName: z.string().trim().min(1, 'Nama lengkap wajib diisi').max(200),
  nik: nikSchema,
  gender: officialGenderSchema,
  birthDate: z.coerce.date({ errorMap: () => ({ message: 'Tanggal lahir wajib diisi' }) }),
  address: z.string().trim().min(1, 'Alamat lengkap wajib diisi').max(1000),
  photoId: z.string().uuid({ message: 'Foto profil wajib diunggah' }),

  // §5 Informasi Kewasitan — jumlah turnamen sengaja tidak ada di sini karena
  // dihitung otomatis dari riwayat turnamen.
  officialStatus: officialStatusSchema.default('AKTIF'),
  officiatingSince: yearSchema,
  roles: officialRoleSchema.array().min(1, 'Pilih minimal satu peran wasit').max(4),
  level: officialLevelSchema.optional(),

  // §6 Lisensi & Sertifikasi
  certificates: officialCertificateInputSchema.array().max(MAX_OFFICIAL_CERTIFICATES).default([]),

  // §7 Riwayat Turnamen
  tournaments: officialTournamentInputSchema.array().max(MAX_OFFICIAL_TOURNAMENTS).default([]),

  // §8 Kontak Wasit
  whatsapp: z.string().trim().min(1, 'Nomor HP / WhatsApp wajib diisi').max(50),
  email: z.union([z.string().trim().email('Format email tidak valid').max(200), z.literal('')]).optional(),
  instagram: z.string().trim().max(100).optional(),
  acceptingAssignments: z.coerce.boolean().default(false),

  // §9 Informasi Tambahan
  experience: z.string().trim().max(4000).optional(),
})

/** §5 — daftar peran tidak boleh memuat nilai ganda. */
function refineUniqueRoles(values: string[], ctx: z.RefinementCtx, path = 'roles') {
  const seen = new Set<string>()
  values.forEach((value, index) => {
    if (seen.has(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path, index], message: 'Peran ini sudah dipilih' })
    }
    seen.add(value)
  })
}

// Aturan lintas-field dipakai ulang oleh varian publik maupun admin.
function refineOfficialFields(
  value: { roles: string[]; birthDate: Date; officiatingSince: number },
  ctx: z.RefinementCtx,
) {
  refineUniqueRoles(value.roles, ctx)

  // Tanggal lahir di masa depan pasti salah ketik.
  if (value.birthDate.getTime() > Date.now()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['birthDate'], message: 'Tanggal lahir tidak boleh di masa depan' })
  }

  // Menjadi wasit sebelum lahir tidak mungkin — cek murah yang menangkap
  // tahun salah ketik seperti 1015.
  if (value.officiatingSince < value.birthDate.getFullYear()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['officiatingSince'],
      message: 'Tahun menjadi wasit tidak boleh sebelum tahun lahir',
    })
  }
}

export const publicOfficialSubmissionSchema = officialFieldsSchema
  .extend({ formToken: z.string().trim().min(1, 'Form token is required') })
  .strict()
  .superRefine(refineOfficialFields)

// Admin direct entry — district diambil dari token admin atau workspace pusat.
export const adminOfficialSubmissionSchema = officialFieldsSchema
  .extend({ districtId: z.string().uuid().optional() })
  .strict()
  .superRefine(refineOfficialFields)

export type OfficialFieldsInput = z.infer<typeof officialFieldsSchema>
export type PublicOfficialSubmissionInput = z.infer<typeof publicOfficialSubmissionSchema>
export type AdminOfficialSubmissionInput = z.infer<typeof adminOfficialSubmissionSchema>

export const reviewOfficialSubmissionSchema = z
  .object({
    action: z.enum(['LINK', 'REJECT']),
    rejectionReason: z.string().trim().max(1000).optional(),
    // §10 — status verifikasi & catatan ditetapkan admin saat menyetujui
    verificationStatus: officialVerificationStatusSchema.default('TERVERIFIKASI'),
    adminNotes: z.string().trim().max(2000).optional(),
    districtId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.action === 'REJECT' && !value.rejectionReason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rejectionReason'], message: 'Alasan penolakan wajib diisi' })
    }
  })

export type ReviewOfficialSubmissionInput = z.infer<typeof reviewOfficialSubmissionSchema>

// Master edit — semua field opsional; sertifikat & riwayat turnamen dikelola
// lewat endpoint sendiri.
export const updateOfficialSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    nik: nikSchema.optional(),
    gender: officialGenderSchema.optional(),
    birthDate: z.coerce.date().optional(),
    address: z.string().trim().min(1).max(1000).optional(),
    photoId: z.string().uuid().optional(),
    officialStatus: officialStatusSchema.optional(),
    officiatingSince: yearSchema.optional(),
    roles: officialRoleSchema.array().min(1, 'Pilih minimal satu peran wasit').max(4).optional(),
    level: officialLevelSchema.nullable().optional(),
    whatsapp: z.string().trim().min(1).max(50).optional(),
    email: z.union([z.string().trim().email().max(200), z.literal('')]).nullable().optional(),
    instagram: z.string().trim().max(100).nullable().optional(),
    acceptingAssignments: z.coerce.boolean().optional(),
    experience: z.string().trim().max(4000).nullable().optional(),
    districtId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.roles) refineUniqueRoles(value.roles, ctx)
    if (value.birthDate && value.birthDate.getTime() > Date.now()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['birthDate'], message: 'Tanggal lahir tidak boleh di masa depan' })
    }
  })

export type UpdateOfficialInput = z.infer<typeof updateOfficialSchema>

// §10 — panel verifikasi terpisah dari edit data wasit
export const verifyOfficialSchema = z
  .object({
    verificationStatus: officialVerificationStatusSchema,
    adminNotes: z.string().trim().max(2000).nullable().optional(),
    districtId: z.string().uuid().optional(),
  })
  .strict()

export type VerifyOfficialInput = z.infer<typeof verifyOfficialSchema>

export const officialIdSchema = z.object({ id: z.string().uuid() })

export const officialCertificateParamsSchema = z.object({
  id: z.string().uuid(),
  certificateId: z.string().uuid(),
})

// ── §6/§7 daftar pada master wasit ───────────────────────────────
// Keduanya ditulis lewat "replace seluruh daftar" agar UI cukup mengirim
// keadaan akhir; baris lama yang tidak lagi disebut akan dihapus.
export const replaceOfficialCertificatesSchema = z
  .object({
    certificates: officialCertificateInputSchema
      .extend({ id: z.string().uuid().optional() })
      .array()
      .max(MAX_OFFICIAL_CERTIFICATES),
  })
  .strict()

export type ReplaceOfficialCertificatesInput = z.infer<typeof replaceOfficialCertificatesSchema>

export const replaceOfficialTournamentsSchema = z
  .object({
    tournaments: officialTournamentInputSchema
      .extend({ id: z.string().uuid().optional() })
      .array()
      .max(MAX_OFFICIAL_TOURNAMENTS),
  })
  .strict()

export type ReplaceOfficialTournamentsInput = z.infer<typeof replaceOfficialTournamentsSchema>

export const officialListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    districtId: z.string().uuid().optional(),
    q: z.string().trim().max(200).optional(),
    verificationStatus: officialVerificationStatusSchema.optional(),
    officialStatus: officialStatusSchema.optional(),
    role: officialRoleSchema.optional(),
    level: officialLevelSchema.optional(),
  })
  .strict()

export const officialSubmissionListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    districtId: z.string().uuid().optional(),
    q: z.string().trim().max(200).optional(),
  })
  .strict()

export const officialDetailQuerySchema = z.object({ districtId: z.string().uuid().optional() }).strict()

export type OfficialListQuery = z.infer<typeof officialListQuerySchema>
