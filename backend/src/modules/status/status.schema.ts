import { z } from 'zod'

export const checkStatusSchema = z.object({
  nik: z.string().regex(/^\d{16}$/, 'NIK harus 16 digit'),
  fullName: z.string().min(1, 'Nama wajib diisi'),
})

export const createAccountSchema = z.object({
  playerId: z.string().uuid(),
  nik: z.string().regex(/^\d{16}$/, 'NIK harus 16 digit'),
  fullName: z.string().min(1),
})

/**
 * Pencarian lapangan publik. Minimal 3 karakter supaya satu huruf tidak bisa
 * dipakai menyedot seluruh tabel.
 */
export const searchFacilitiesSchema = z.object({
  q: z.string().trim().min(3, 'Kata kunci minimal 3 karakter').max(100),
})

export type CheckStatusInput = z.infer<typeof checkStatusSchema>
export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type SearchFacilitiesInput = z.infer<typeof searchFacilitiesSchema>
