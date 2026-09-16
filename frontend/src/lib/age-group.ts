import type { Gender } from '../types/portal'

/** Keep the PA/PI track visible when an older record only stores the base group. */
export function formatAgeGroup(ageGroup?: string | null, gender?: Gender | null): string {
  if (!ageGroup) return '—'

  const normalized = ageGroup.replace(/\s+(PUTRA|PUTRI)$/i, (value) => value.toUpperCase() === 'PUTRA' ? ' PA' : ' PI')
  if (/\b(PA|PI)$/i.test(normalized) || !gender) return normalized
  return `${normalized} ${gender === 'PUTRA' ? 'PA' : 'PI'}`
}
