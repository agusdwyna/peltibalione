/**
 * Satu sumber kebenaran untuk "apa yang boleh dilihat publik".
 *
 * Sebelumnya konstanta ini ditulis ulang di beberapa router. Karena halaman
 * publik kini bertambah banyak, definisinya dikumpulkan di sini supaya tidak
 * mungkin lagi ada satu halaman yang memakai definisi berbeda dari yang lain —
 * perbedaan seperti itu persis yang membuat data sensitif bocor tanpa disadari.
 */

/**
 * Status pemain yang boleh tampil publik.
 *
 * Sengaja tidak memuat PENDING_VERIFICATION, DRAFT, REJECTED, dan ARCHIVED:
 * pemain yang belum diverifikasi belum boleh muncul, dan yang ditolak atau
 * diarsipkan justru harus hilang dari pandangan publik.
 */
export const PUBLIC_PLAYER_STATUSES = ['VERIFIED', 'ACTIVE', 'INACTIVE'] as const

/** Hanya lapangan yang sudah diverifikasi admin yang tampil publik. */
export const PUBLIC_FACILITY_STATUS = 'TERVERIFIKASI' as const

/** Idem untuk pelatih. */
export const PUBLIC_COACH_STATUS = 'TERVERIFIKASI' as const

/** Idem untuk wasit. */
export const PUBLIC_OFFICIAL_STATUS = 'TERVERIFIKASI' as const

/**
 * Umur menurut cara sistem menghitungnya: selisih TAHUN, bukan selisih hari.
 *
 * Sengaja meniru `resolveAgeGroup()` (lihat `age-group.ts`) alih-alih memakai
 * perhitungan yang lebih presisi. Kalau di sini dihitung sampai hari, angka
 * umur yang tampil bisa berbeda satu tahun dari kelompok umur yang tersimpan —
 * dan dua angka yang saling bertentangan di halaman yang sama lebih buruk
 * daripada satu angka yang sedikit kasar.
 */
export function ageInYears(birthDate: Date | null | undefined): number | null {
  if (!birthDate) return null
  const age = new Date().getFullYear() - birthDate.getFullYear()
  return age >= 0 ? age : null
}

/**
 * Ubah tanggal menjadi tahun saja.
 *
 * Dipakai untuk prestasi & sertifikat pemain: pemain KU 8–18 adalah anak-anak,
 * dan tanggal pertandingan yang persis mempublikasikan pola pergerakan mereka.
 * Tahunnya saja sudah cukup memberi konteks.
 */
export function yearOnly(value: Date | null | undefined): number | null {
  return value ? value.getFullYear() : null
}
