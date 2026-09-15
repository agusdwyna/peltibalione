import { z } from 'zod'

export const checkStatusSchema = z.object({
  nik: z.string().min(16, 'NIK harus 16 digit').max(16),
  fullName: z.string().min(1, 'Nama wajib diisi'),
})

export const createAccountSchema = z.object({
  playerId: z.string().uuid(),
  nik: z.string().regex(/^\d{16}$/, 'NIK harus 16 digit'),
  fullName: z.string().min(1),
})

export type CheckStatusInput = z.infer<typeof checkStatusSchema>
export type CreateAccountInput = z.infer<typeof createAccountSchema>