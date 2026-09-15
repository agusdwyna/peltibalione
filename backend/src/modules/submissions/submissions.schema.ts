import { z } from 'zod'

export const publicSubmissionSchema = z.object({
  formToken: z.string().min(1, 'Form token is required'),
  fullName: z.string().min(1, 'Full name is required'),
  nik: z
    .string()
    .regex(/^\d{16}$/, 'NIK must be 16 digits'),
  birthPlace: z.string().optional(),
  birthDate: z.coerce.date().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  clubName: z.string().optional(),
  instagram: z.string().optional(),
  whatsapp: z.string().optional(),
  ageGroup: z.string().optional(),
  pnpRank: z.coerce.number().int().positive().optional(),
  pnpPeriod: z.string().optional(),
  photoId: z.string().uuid('Foto diri wajib diunggah'),
  achievementPhotoId: z.string().uuid().optional(),
})

// Admin direct submit — formToken optional; resolved from the admin's district
export const adminSubmissionSchema = publicSubmissionSchema.extend({
  formToken: z.string().optional(),
  // Central Admin has no district scope — pass it explicitly
  districtId: z.string().uuid().optional(),
})

export type PublicSubmissionInput = z.infer<typeof publicSubmissionSchema>
export type AdminSubmissionInput = z.infer<typeof adminSubmissionSchema>

export const reviewSubmissionSchema = z.object({
  action: z.enum(['LINK', 'REJECT']),
  rejectionReason: z.string().optional(),
  // when LINK, optionally resolve/create a club from clubName
  clubId: z.string().uuid().optional(),
  // Central Admin must provide the selected workspace district.
  districtId: z.string().uuid().optional(),
})

export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>