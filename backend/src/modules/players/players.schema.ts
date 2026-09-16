import { z } from 'zod'

const optionalText = z.string().trim().max(500).nullable().optional()

export const playerIdSchema = z.object({
  id: z.string().uuid(),
})

export const playerChildParamsSchema = z.object({
  id: z.string().uuid(),
  childId: z.string().uuid(),
})

export const updatePersonalInfoSchema = z.object({
  fullName: z.string().trim().min(1).max(200).optional(),
  // Identity fields stay editable by authorized admins only, and the client
  // must confirm the change explicitly (see `confirmIdentityChange`).
  nik: z.string().trim().regex(/^\d{16}$/, 'NIK harus 16 digit').optional(),
  gender: z.enum(['PUTRA', 'PUTRI']).nullable().optional(),
  birthPlace: optionalText,
  birthDate: z.coerce.date().nullable().optional(),
  address: optionalText,
  phone: optionalText,
  instagram: optionalText,
  whatsapp: optionalText,
  confirmIdentityChange: z.boolean().optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 1 || !('confirmIdentityChange' in value),
  'At least one field is required',
)

export const transferPlayerSchema = z.object({
  toDistrictId: z.string().uuid(),
}).strict()

export const createPnpRankingSchema = z.object({
  rank: z.number().int().positive(),
  period: z.string().trim().min(1).max(30),
})

export const updatePnpRankingSchema = createPnpRankingSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
)

export const createTrackRecordSchema = z.object({
  title: z.string().trim().min(1).max(200),
  eventName: optionalText,
  eventDate: z.coerce.date().nullable().optional(),
  category: optionalText,
  result: optionalText,
  description: z.string().trim().max(2000).nullable().optional(),
})

export const updateTrackRecordSchema = createTrackRecordSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
)

export const createCertificateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  issuer: optionalText,
  issuedAt: z.coerce.date().nullable().optional(),
  certificateNo: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  fileId: z.string().uuid().nullable().optional(),
  trackRecordId: z.string().uuid().nullable().optional(),
})

export const updateCertificateSchema = createCertificateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
)

export type UpdatePersonalInfoInput = z.infer<typeof updatePersonalInfoSchema>
export type CreatePnpRankingInput = z.infer<typeof createPnpRankingSchema>
export type UpdatePnpRankingInput = z.infer<typeof updatePnpRankingSchema>
export type CreateTrackRecordInput = z.infer<typeof createTrackRecordSchema>
export type UpdateTrackRecordInput = z.infer<typeof updateTrackRecordSchema>
export type CreateCertificateInput = z.infer<typeof createCertificateSchema>
export type UpdateCertificateInput = z.infer<typeof updateCertificateSchema>
