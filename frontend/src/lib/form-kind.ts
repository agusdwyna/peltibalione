/**
 * Jenis pendataan publik beserta route form dan sebutannya.
 * Dipakai bersama oleh halaman detail wilayah dan halaman form publik, supaya
 * route tidak pernah lagi di-hardcode ke salah satu jenis.
 */
export type FormKind = 'player' | 'coach' | 'facility' | 'official'

export const FORM_KINDS: FormKind[] = ['player', 'coach', 'facility', 'official']

/** Route form tiap jenis — nilainya diawali garis miring, tanpa token. */
export const FORM_ROUTES: Record<FormKind, string> = {
  player: '/form/player',
  facility: '/form/facility',
  coach: '/form/coach',
  official: '/form/official',
}

/** Sebutan untuk kalimat ajakan, mis. "pendaftaran untuk peserta wilayah X". */
export const FORM_SUBJECT: Record<FormKind, string> = {
  player: 'peserta',
  coach: 'pelatih',
  facility: 'lapangan',
  official: 'wasit',
}

/** Judul halaman form, dipakai saat form tidak dapat dimuat. */
export const FORM_TITLE: Record<FormKind, string> = {
  player: 'Pendaftaran Pemain',
  coach: 'Pendataan Pelatih',
  facility: 'Pendataan Lapangan',
  official: 'Pendataan Wasit',
}

export function isFormKind(value: string | undefined): value is FormKind {
  return value !== undefined && (FORM_KINDS as string[]).includes(value)
}
