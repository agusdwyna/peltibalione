import type { AgeGroup, Gender } from '../types/portal'

/** Keep the PA/PI track visible when an older record only stores the base group. */
export function formatAgeGroup(ageGroup?: string | null, gender?: Gender | null): string {
  if (!ageGroup) return '—'

  const normalized = ageGroup.replace(/\s+(PUTRA|PUTRI)$/i, (value) => value.toUpperCase() === 'PUTRA' ? ' PA' : ' PI')
  if (/\b(PA|PI)$/i.test(normalized) || !gender) return normalized
  return `${normalized} ${gender === 'PUTRA' ? 'PA' : 'PI'}`
}

/**
 * Umur menurut cara server menghitungnya: selisih TAHUN, bukan selisih tanggal.
 *
 * Sengaja tidak memakai umur sampai hari. Server memakai
 * `tahun sekarang - tahun lahir` (lihat backend `shared/utils/age-group.ts`),
 * jadi kalau di sini dihitung lebih presisi, tampilan akan menampilkan
 * kelompok yang berbeda dari yang benar-benar disimpan server. Dua rumus yang
 * berbeda untuk hal yang sama lebih buruk daripada satu rumus yang sedikit
 * kasar — jadi rumus server yang ditiru, bukan yang "lebih benar".
 */
export function ageInYears(birthDate?: string | Date | null): number | null {
  if (!birthDate) return null
  const born = birthDate instanceof Date ? birthDate : new Date(birthDate)
  if (Number.isNaN(born.getTime())) return null
  const age = new Date().getFullYear() - born.getFullYear()
  return age >= 0 ? age : null
}

/**
 * Menentukan kelompok umur dari tanggal lahir + jenis kelamin.
 *
 * Ini cerminan dari `resolveAgeGroup()` di backend. Urutannya sengaja sama:
 * cari kelompok pertama (menurut sortOrder) yang rentang umurnya memuat umur
 * pemain dan cocok jenis kelaminnya; bila tidak ada, jatuh ke kelompok terbuka
 * (`maxAge` null).
 *
 * Dipakai HANYA untuk menampilkan. Server tetap yang menentukan nilai akhir —
 * jadi bila master berubah dan dua perhitungan berbeda, yang tersimpan tetap
 * versi server.
 *
 * Mengembalikan `null` bila tidak ada kelompok yang cocok. Itu keadaan yang
 * sah: master hanya mencakup pemain junior (KU 8–18), sehingga pemain dewasa
 * memang tidak punya kelompok umur.
 */
export function resolveAgeGroup(groups: AgeGroup[], birthDate?: string | Date | null, gender?: Gender | null): AgeGroup | null {
  const age = ageInYears(birthDate)
  if (age === null) return null

  const ordered = [...groups].sort((a, b) => a.sortOrder - b.sortOrder)
  // Jenis kelamin null dianggap cocok dengan apa pun — sama seperti server,
  // yang tidak menyaring bila jenis kelamin belum diketahui.
  const genderFits = (group: AgeGroup) => !gender || !group.gender || group.gender === gender

  const inBand = ordered.find((group) =>
    group.minAge <= age
    && (group.maxAge === null || group.maxAge === undefined || group.maxAge >= age)
    && genderFits(group))
  if (inBand) return inBand

  return ordered.find((group) => (group.maxAge === null || group.maxAge === undefined) && genderFits(group)) ?? null
}

/** Sebutan kelompok umur untuk ditampilkan, mis. "KU 14 Putra". */
export function ageGroupLabel(group: AgeGroup | null): string {
  if (!group) return '—'
  return group.name || group.code
}
