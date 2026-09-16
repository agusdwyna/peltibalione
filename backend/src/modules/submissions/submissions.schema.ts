import { z } from 'zod'

const submissionFieldsSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(200),
  nik: z
    .string()
    .regex(/^\d{16}$/, 'NIK must be 16 digits'),
  birthPlace: z.string().trim().max(200).optional(),
  // A birth date is required because the server derives the age group from it.
  birthDate: z.coerce.date(),
  gender: z.enum(['PUTRA', 'PUTRI']),
  address: z.string().trim().max(1000).optional(),
  phone: z.string().trim().max(50).optional(),
  clubName: z.string().trim().max(200).optional(),
  instagram: z.string().trim().max(100).optional(),
  whatsapp: z.string().trim().max(50).optional(),
  pnpRank: z.coerce.number().int().positive().optional(),
  pnpPeriod: z.string().trim().max(30).optional(),
  photoId: z.string().uuid('Foto diri wajib diunggah'),
  achievementPhotoId: z.string().uuid().optional(),
}).strict()

export const publicSubmissionSchema = submissionFieldsSchema.extend({
  formToken: z.string().trim().min(1, 'Form token is required'),
}).strict()

// Admin direct submit — formToken is intentionally not needed; the district is
// resolved from the authenticated admin or explicit central-admin context.
export const adminSubmissionSchema = submissionFieldsSchema.extend({
  formToken: z.string().trim().min(1).optional(),
  districtId: z.string().uuid().optional(),
}).strict()

export type PublicSubmissionInput = z.infer<typeof publicSubmissionSchema>
export type AdminSubmissionInput = z.infer<typeof adminSubmissionSchema>

export const reviewSubmissionSchema = z.object({
  action: z.enum(['LINK', 'REJECT']),
  rejectionReason: z.string().trim().max(1000).optional(),
  // when LINK, optionally resolve/create a club from clubName
  clubId: z.string().uuid().optional(),
  // Central Admin must provide the selected workspace district.
  districtId: z.string().uuid().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.action === 'REJECT' && !value.rejectionReason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rejectionReason'], message: 'Rejection reason is required' })
  }
})

export const submissionIdSchema = z.object({ id: z.string().uuid() })

export const submissionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  districtId: z.string().uuid().optional(),
  q: z.string().trim().max(200).optional(),
}).strict()

export const submissionDetailQuerySchema = z.object({
  districtId: z.string().uuid().optional(),
}).strict()

export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>
export type SubmissionListQuery = z.infer<typeof submissionListQuerySchema>