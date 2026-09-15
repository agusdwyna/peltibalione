/**
 * Mask NIK for display in lists and profile views.
 * Shows only the first and last four digits.
 */
export function maskNik(nik: string): string {
  if (nik.length < 8) return '****'
  return `${nik.slice(0, 4)}${'*'.repeat(nik.length - 8)}${nik.slice(-4)}`
}
