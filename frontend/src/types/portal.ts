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
  person: z.object({ fullName: z.string(), nik: z.string().nullable().optional(), gender: genderSchema.nullable().optional() }),
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
  person: z.object({
    fullName: z.string(), nik: z.string().nullable().optional(), gender: genderSchema.nullable().optional(), birthPlace: z.string().nullable().optional(),
    birthDate: z.string().nullable().optional(), address: z.string().nullable().optional(), phone: z.string().nullable().optional(),
    instagram: z.string().nullable().optional(), whatsapp: z.string().nullable().optional(),
  }),
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

export const formSchema = z.object({
  id: z.string(), title: z.string(), description: z.string().nullable().optional(), publicToken: z.string(), status: z.string(),
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
  players: z.array(z.object({ playerCode: z.string(), fullName: z.string() })),
})
export type PublicDistrictOverview = z.infer<typeof publicDistrictOverviewSchema>

export const checkStatusResultSchema = z.object({
  submissionId: z.string(), fullName: z.string(), submissionStatus: z.string(),
  playerStatus: z.string().nullable(), playerId: z.string().nullable(), personId: z.string().nullable(),
  playerCode: z.string().nullable(), district: z.object({ name: z.string(), code: z.string() }).nullable(),
  rejectionReason: z.string().optional(), createdAt: z.string(),
})
export type CheckStatusResult = z.infer<typeof checkStatusResultSchema>

export const publicSubmissionSchema = z.object({
  formToken: z.string().min(1), fullName: z.string().min(1), birthPlace: z.string().optional(), birthDate: z.string().min(1),
  gender: genderSchema, nik: z.string().regex(/^\d{16}$/, 'NIK harus terdiri dari 16 digit'), address: z.string().optional(), phone: z.string().optional(),
  clubName: z.string().optional(), instagram: z.string().optional(), whatsapp: z.string().optional(),
  pnpRank: z.coerce.number().int().positive().optional(), pnpPeriod: z.string().optional(),
  photoId: z.string().min(1, 'Foto diri wajib diunggah'), achievementPhotoId: z.string().optional(),
})
export type PublicSubmissionInput = z.infer<typeof publicSubmissionSchema>
