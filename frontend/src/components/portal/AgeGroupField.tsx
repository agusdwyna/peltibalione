import { ageGroupLabel, resolveAgeGroup } from '../../lib/age-group'
import type { AgeGroup, Gender } from '../../types/portal'

type Props = {
  /** Master kelompok umur dari server. */
  groups: AgeGroup[]
  /** Tanggal lahir dalam format `YYYY-MM-DD` (nilai input date). */
  birthDate: string
  gender: Gender | '' | null
  /** Kelas untuk elemen select, agar seragam dengan field lain di formnya. */
  className?: string
  labelClassName?: string
}

/**
 * Kelompok umur sebagai tampilan saja — tidak pernah dikirim ke server.
 *
 * Nilainya diturunkan dari tanggal lahir + jenis kelamin, memakai rumus yang
 * sama dengan server, sehingga tidak pernah bisa berbeda dari yang benar-benar
 * akan disimpan. Karena diturunkan (bukan disimpan di state), angkanya ikut
 * berubah sendiri saat pengguna mengubah tanggal lahir atau jenis kelamin —
 * itulah yang membuatnya tetap benar ketika umur peserta bertambah.
 *
 * Pemain dewasa sengaja tidak menampilkan field ini sama sekali: master hanya
 * mencakup KU 8–18, jadi menampilkan kotak bertanda "—" hanya membingungkan.
 */
export default function AgeGroupField({ groups, birthDate, gender, className = 'form-select w-full', labelClassName }: Props) {
  const group = resolveAgeGroup(groups, birthDate || null, gender || null)

  // Jenis kelamin belum dipilih dan tanggal lahir belum diisi -> tidak ada yang
  // bisa ditampilkan. Daripada menampilkan kotak kosong, sembunyikan saja.
  const age = birthDate ? new Date().getFullYear() - new Date(birthDate).getFullYear() : null
  const isJunior = age !== null && groups.some((item) => item.minAge <= age && (item.maxAge ?? 999) >= age)
  if (!isJunior) return null

  return <label>
    <span className={labelClassName ?? 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200'}>Kelompok umur</span>
    <select className={className} value={group?.code ?? ''} disabled aria-readonly="true" tabIndex={-1}>
      {group
        ? <option value={group.code}>{ageGroupLabel(group)}</option>
        : <option value="">Terisi otomatis</option>}
    </select>
    <span className="mt-1 block text-xs text-gray-500">Terisi otomatis dari tanggal lahir dan jenis kelamin.</span>
  </label>
}
