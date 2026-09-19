import { z } from 'zod'

export const paginationMetaSchema = z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() })
export type PaginationMeta = z.infer<typeof paginationMetaSchema>

export const statsOverviewSchema = z.object({
  athletes: z.number(), verified: z.number(), pending: z.number(), activeForms: z.number(),
  totalSubmissions: z.number(), pendingSubmissions: z.number(), clubs: z.number(),
})
export type StatsOverview = z.infer<typeof statsOverviewSchema>

export const genderSchema = z.enum(['PUTRA', 'PUTRI'])
export type Gender = z.infer<typeof genderSchema>

export const playerSchema = z.object({
  id: z.string(), playerCode: z.string(), status: z.string(), ageGroup: z.string().nullable().optional(),
  fullName: z.string(), nik: z.string().nullable().optional(), gender: genderSchema.nullable().optional(),
  district: z.object({ name: z.string(), code: z.string() }),
  club: z.object({ name: z.string() }).nullable().optional(),
})
export type Player = z.infer<typeof playerSchema>

export const pnpRankingSchema = z.object({
  id: z.string().optional(), rank: z.number(), period: z.string(), updatedAt: z.string(),
})
export type PnpRanking = z.infer<typeof pnpRankingSchema>

export const trackRecordSchema = z.object({
  id: z.string().optional(), title: z.string(), eventName: z.string().nullable().optional(),
  eventDate: z.string().nullable().optional(), category: z.string().nullable().optional(),
  result: z.string().nullable().optional(), description: z.string().nullable().optional(),
  createdAt: z.string().optional(), updatedAt: z.string().optional(),
})
export type TrackRecord = z.infer<typeof trackRecordSchema>

export const certificateSchema = z.object({
  id: z.string().optional(), title: z.string(), issuer: z.string().nullable().optional(),
  issuedAt: z.string().nullable().optional(), certificateNo: z.string().nullable().optional(),
  notes: z.string().nullable().optional(), fileId: z.string().nullable().optional(),
  trackRecordId: z.string().nullable().optional(),
  file: z.object({ id: z.string(), originalName: z.string(), mimeType: z.string(), size: z.number() }).nullable().optional(),
  createdAt: z.string().optional(), updatedAt: z.string().optional(),
})
export type Certificate = z.infer<typeof certificateSchema>

export const playerDetailSchema = z.object({
  id: z.string(), playerCode: z.string(), status: z.string(), ageGroup: z.string().nullable().optional(),
  createdAt: z.string().optional(), updatedAt: z.string().optional(),
  fullName: z.string(), nik: z.string().nullable().optional(), gender: genderSchema.nullable().optional(), birthPlace: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(), address: z.string().nullable().optional(), phone: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(), whatsapp: z.string().nullable().optional(),
  district: z.object({ id: z.string().optional(), name: z.string(), code: z.string() }),
  club: z.object({ name: z.string(), districtId: z.string().nullable().optional() }).nullable().optional(),
  photo: z.object({ id: z.string(), originalName: z.string(), mimeType: z.string(), size: z.number() }).nullable().optional(),
  pnpRankings: pnpRankingSchema.array().optional(),
  trackRecords: trackRecordSchema.array().optional(),
  certificates: certificateSchema.array().optional(),
  districtHistory: z.array(z.object({
    id: z.string().optional(), reason: z.string().nullable().optional(), changedAt: z.string(),
    fromDistrict: z.object({ name: z.string() }).nullable().optional(),
    toDistrict: z.object({ name: z.string() }).optional(),
  })).optional(),
})
export type PlayerDetail = z.infer<typeof playerDetailSchema>

export const updatePlayerPersonalInfoSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  nik: z.string().trim().regex(/^\d{16}$/, 'NIK harus 16 digit').optional(),
  gender: genderSchema.nullable().optional(),
  birthPlace: z.string().trim().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  instagram: z.string().trim().nullable().optional(),
  whatsapp: z.string().trim().nullable().optional(),
  confirmIdentityChange: z.boolean().optional(),
})
export type UpdatePlayerPersonalInfoInput = z.infer<typeof updatePlayerPersonalInfoSchema>

export const formTypeSchema = z.enum([
  'PLAYER_REGISTRATION',
  'FACILITY_REGISTRATION',
  'COACH_REGISTRATION',
  'OFFICIAL_REGISTRATION',
])
export type FormType = z.infer<typeof formTypeSchema>

export const formSchema = z.object({
  id: z.string(), title: z.string(), description: z.string().nullable().optional(), publicToken: z.string(), status: z.string(),
  type: formTypeSchema.optional(),
  district: z.object({ name: z.string(), code: z.string() }).optional(),
  owner: z.object({ name: z.string(), email: z.string() }).optional(),
  _count: z.object({ submissions: z.number() }).optional(),
  submissionStats: z.record(z.string(), z.number()).optional(),
})
export type RegistrationForm = z.infer<typeof formSchema>

export const submissionSchema = z.object({
  id: z.string(), fullName: z.string(), birthPlace: z.string().nullable().optional(), birthDate: z.string().nullable().optional(),
  nik: z.string().nullable().optional(), status: z.string(), duplicateMatch: z.string().nullable().optional(), rejectionReason: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(), whatsapp: z.string().nullable().optional(), gender: genderSchema.nullable().optional(), ageGroup: z.string().nullable().optional(),
  kind: z.enum(['SUBMISSION', 'TRANSFER']).optional(), info: z.string().nullable().optional(),
  form: z.object({ title: z.string(), district: z.object({ name: z.string() }) }).optional(),
})
export type Submission = z.infer<typeof submissionSchema>

export const submissionDetailSchema = submissionSchema.extend({
  address: z.string().nullable().optional(), phone: z.string().nullable().optional(), instagram: z.string().nullable().optional(), whatsapp: z.string().nullable().optional(), ageGroup: z.string().nullable().optional(), pnpRank: z.number().nullable().optional(), pnpPeriod: z.string().nullable().optional(),
  form: z.object({ title: z.string(), district: z.object({ name: z.string(), code: z.string() }) }).optional(),
  files: z.array(z.object({ id: z.string(), entityType: z.string(), originalName: z.string(), mimeType: z.string(), size: z.number() })).optional(),
  createdAt: z.string().optional(), reviewedAt: z.string().nullable().optional(),
})
export type SubmissionDetail = z.infer<typeof submissionDetailSchema>

export const verificationSchema = z.object({
  id: z.string(), level: z.string(), status: z.string(), entityType: z.string(), entityId: z.string(), payload: z.unknown().optional(),
  district: z.object({ name: z.string() }).optional(),
})
export type VerificationRequest = z.infer<typeof verificationSchema>

export const ageGroupSchema = z.object({
  id: z.string(), code: z.string(), name: z.string(), minAge: z.number().optional(), maxAge: z.number().nullable().optional(),
  gender: genderSchema.nullable().optional(), sortOrder: z.number(),
})
export type AgeGroup = z.infer<typeof ageGroupSchema>

export const publicDistrictOverviewSchema = z.object({
  district: z.object({ id: z.string(), code: z.string(), name: z.string(), officialPlayerCount: z.number() }),
  players: z.array(z.object({
    playerCode: z.string(), fullName: z.string(),
    gender: z.string().nullable().optional(), ageGroup: z.string().nullable().optional(),
    status: z.string().optional(), clubName: z.string().nullable().optional(),
    pnpRank: z.number().nullable().optional(), pnpPeriod: z.string().nullable().optional(),
  })),
  facilities: z.array(z.object({
    facilityCode: z.string(), name: z.string(), address: z.string().optional(),
    courtCount: z.number().optional(), courtType: z.string().optional(),
    grade: z.string().nullable().optional(), openTime: z.string().nullable().optional(), closeTime: z.string().nullable().optional(),
    /** Foto lapangan publik; dipakai kartu di halaman kabupaten. */
    coverPhotoId: z.string().nullable().optional(),
  })).optional(),
  coaches: z.array(z.object({
    coachCode: z.string(), fullName: z.string(), clubName: z.string().nullable().optional(),
    coachingSince: z.number().nullable().optional(), specializations: z.array(z.string()).optional(),
    photoId: z.string().nullable().optional(),
  })).optional(),
  officials: z.array(z.object({
    officialCode: z.string(), fullName: z.string(), level: z.string().nullable().optional(),
    officiatingSince: z.number().nullable().optional(), roles: z.array(z.string()).optional(),
    photoId: z.string().nullable().optional(),
  })).optional(),
  /** Token form aktif per jenis — dipakai tombol Daftar di halaman detail publik. */
  registrationForms: z.object({
    player: z.string().nullable(), facility: z.string().nullable(),
    coach: z.string().nullable(), official: z.string().nullable(),
  }).optional(),
})
export type PublicDistrictOverview = z.infer<typeof publicDistrictOverviewSchema>

export const statusRoleSchema = z.enum(['PLAYER', 'COACH', 'OFFICIAL'])
export type StatusRole = z.infer<typeof statusRoleSchema>

/**
 * Satu peran yang ditemukan dari pencarian NIK. Satu NIK bisa memunculkan
 * beberapa entri sekaligus — orang yang jadi pemain dan pelatih punya dua baris.
 */
export const statusEntrySchema = z.object({
  role: statusRoleSchema,
  fullName: z.string(),
  /** Kode resmi (PL-/CO-/RF-). Kosong selama pengajuan belum disetujui. */
  code: z.string().nullable(),
  /**
   * Status di tabel master. Pemain memakai PlayerStatus, pelatih & wasit
   * memakai TERVERIFIKASI. Kosong bila record master belum terbentuk.
   */
  verification: z.string().nullable(),
  /** Status pengajuan terakhir — terbaca walau master belum terbentuk. */
  submissionStatus: z.string().nullable(),
  district: z.object({ name: z.string(), code: z.string() }).nullable(),
  rejectionReason: z.string().optional(),
  /** Hanya ada untuk pemain yang sudah punya record master. */
  playerId: z.string().optional(),
})
export type StatusEntry = z.infer<typeof statusEntrySchema>

export const checkStatusResultSchema = z.object({
  nik: z.string(),
  roles: z.array(statusEntrySchema),
})
export type CheckStatusResult = z.infer<typeof checkStatusResultSchema>

export const facilitySearchResultSchema = z.object({
  query: z.string(),
  facilities: z.array(z.object({
    facilityCode: z.string(), name: z.string(), address: z.string(),
    courtCount: z.number(), courtType: z.string(),
    grade: z.string().nullable().optional(),
    openTime: z.string().nullable().optional(), closeTime: z.string().nullable().optional(),
    district: z.object({ name: z.string(), code: z.string() }).nullable(),
  })),
})
export type FacilitySearchResult = z.infer<typeof facilitySearchResultSchema>

// ── Detail publik per entitas ────────────────────────────────────────────
// Skema ini sengaja TIDAK memuat field pribadi apa pun (NIK, tanggal lahir,
// alamat, kontak). Server memang tidak pernah mengirimnya; ketiadaan field di
// sini membuat kalau suatu saat server salah mengirim, `parse` akan menolak
// alih-alih diam-diam menampilkannya.

/** Label prestasi & kategori — dipakai bersama halaman admin dan portal publik. */
export const ACHIEVEMENT_RESULT_LABELS: Record<string, string> = {
  PARTICIPANT: 'Peserta', CHAMPION_3: 'Juara 3', CHAMPION_2: 'Juara 2', CHAMPION_1: 'Juara 1',
  juara_1: 'Juara 1', juara_2: 'Juara 2', juara_3: 'Juara 3', peserta: 'Peserta',
}
export const ACHIEVEMENT_CATEGORY_LABELS: Record<string, string> = {
  competition: 'Kompetisi', training: 'Pelatihan', other: 'Lainnya',
}

const publicDistrictRef = z.object({ name: z.string(), code: z.string() })

export const publicPlayerDetailSchema = z.object({
  playerCode: z.string(), fullName: z.string(),
  gender: z.string().nullable().optional(),
  ageGroup: z.string().nullable().optional(),
  /** Umur menurut selisih tahun — rumus yang sama dengan kelompok umur. */
  age: z.number().nullable().optional(),
  status: z.string(),
  district: publicDistrictRef,
  clubName: z.string().nullable().optional(),
  pnpRankings: z.array(z.object({ rank: z.number(), period: z.string() })),
  achievements: z.array(z.object({
    title: z.string(), eventName: z.string().nullable().optional(),
    category: z.string().nullable().optional(), result: z.string().nullable().optional(),
    /** Tahun saja — tanggal persis sengaja tidak pernah dikirim server. */
    year: z.number().nullable().optional(),
  })),
  certificates: z.array(z.object({
    title: z.string(), issuer: z.string().nullable().optional(), year: z.number().nullable().optional(),
  })),
})
export type PublicPlayerDetail = z.infer<typeof publicPlayerDetailSchema>

export const publicCoachDetailSchema = z.object({
  coachCode: z.string(), fullName: z.string(), gender: z.string().nullable().optional(),
  coachStatus: z.string(), coachingSince: z.number().nullable().optional(),
  experienceYears: z.number().nullable().optional(),
  clubName: z.string().nullable().optional(),
  athleteCategories: z.array(z.string()), activeAthletes: z.number().nullable().optional(),
  specializations: z.array(z.string()), otherSpecialization: z.string().nullable().optional(),
  acceptingNewAthletes: z.boolean(), experience: z.string().nullable().optional(),
  photoId: z.string().nullable().optional(), district: publicDistrictRef,
  certificates: z.array(z.object({
    name: z.string(), level: z.string().nullable().optional(),
    issuer: z.string().nullable().optional(), year: z.number().nullable().optional(),
  })),
})
export type PublicCoachDetail = z.infer<typeof publicCoachDetailSchema>

export const publicOfficialDetailSchema = z.object({
  officialCode: z.string(), fullName: z.string(), gender: z.string().nullable().optional(),
  officialStatus: z.string(), officiatingSince: z.number(),
  experienceYears: z.number().nullable().optional(),
  roles: z.array(z.string()), level: z.string().nullable().optional(),
  acceptingAssignments: z.boolean(), experience: z.string().nullable().optional(),
  photoId: z.string().nullable().optional(), district: publicDistrictRef,
  tournaments: z.array(z.object({
    name: z.string(), year: z.number().nullable().optional(),
    level: z.string().nullable().optional(), role: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
  })),
  certificates: z.array(z.object({
    name: z.string(), level: z.string().nullable().optional(),
    issuer: z.string().nullable().optional(), year: z.number().nullable().optional(),
  })),
})
export type PublicOfficialDetail = z.infer<typeof publicOfficialDetailSchema>

export const publicFacilityDetailSchema = z.object({
  facilityCode: z.string(), name: z.string(), address: z.string(),
  mapsUrl: z.string().nullable().optional(), description: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(), longitude: z.number().nullable().optional(),

  courtCount: z.number(), courtType: z.string(), surface: z.string(),
  courtLength: z.number().nullable().optional(), courtWidth: z.number().nullable().optional(),
  clearanceBack: z.number().nullable().optional(), clearanceLeft: z.number().nullable().optional(),
  clearanceRight: z.number().nullable().optional(),
  surfaceCondition: z.string(), hasLighting: z.boolean(), lightCount: z.number().nullable().optional(),
  netCondition: z.string(),

  operationalStatus: z.string(), openTime: z.string().nullable().optional(),
  closeTime: z.string().nullable().optional(), accessType: z.string(),
  hourlyRate: z.number().nullable().optional(),

  grade: z.string().nullable().optional(),
  district: publicDistrictRef,

  /** Satu-satunya kontak yang tampil publik — kontak tempat usaha. */
  managerName: z.string().nullable().optional(), picName: z.string().nullable().optional(),
  picPhone: z.string().nullable().optional(),

  coverPhotoId: z.string().nullable().optional(),
  photoIds: z.array(z.string()),
  amenities: z.array(z.object({
    code: z.string(), customName: z.string().nullable().optional(),
    description: z.string().nullable().optional(), photoIds: z.array(z.string()),
  })),
})
export type PublicFacilityDetail = z.infer<typeof publicFacilityDetailSchema>

export const publicSubmissionSchema = z.object({
  formToken: z.string().min(1), fullName: z.string().min(1), birthPlace: z.string().optional(), birthDate: z.string().min(1),
  gender: genderSchema, nik: z.string().regex(/^\d{16}$/, 'NIK harus terdiri dari 16 digit'), address: z.string().optional(), phone: z.string().optional(),
  clubName: z.string().optional(), instagram: z.string().optional(), whatsapp: z.string().optional(),
  pnpRank: z.coerce.number().int().positive().optional(), pnpPeriod: z.string().optional(),
  photoId: z.string().min(1, 'Foto diri wajib diunggah'), achievementPhotoId: z.string().optional(),
})
export type PublicSubmissionInput = z.infer<typeof publicSubmissionSchema>
