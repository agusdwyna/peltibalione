/**
 * Mask NIK for display. Shows first 4 and last 4 digits.
 * Example: 3273012345678901 → 3273********8901
 */
export function maskNik(nik: string): string {
  if (nik.length < 8) return '****'
  return nik.slice(0, 4) + '*'.repeat(nik.length - 8) + nik.slice(-4)
}
