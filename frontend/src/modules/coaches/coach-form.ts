import type {
  AthleteCategory,
  CoachCertificateInput,
  CoachFormInput,
  CoachGender,
  CoachSpecialization,
  CoachStatus,
} from '../../types/coach'

function text(fd: FormData, key: string) {
  const value = String(fd.get(key) ?? '').trim()
  return value || undefined
}

function integer(fd: FormData, key: string) {
  const value = String(fd.get(key) ?? '').trim()
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined
}

/** Checkbox group: semua yang tercentang dikirim dengan nama kolom yang sama. */
function checkedValues<T extends string>(fd: FormData, key: string): T[] {
  return fd.getAll(key).map((value) => String(value) as T)
}

/** Rakit payload pelatih dari FormData + state foto & sertifikat yang dikelola komponen. */
export function readCoachForm(
  fd: FormData,
  photoId: string | null,
  certificates: CoachCertificateInput[],
): CoachFormInput {
  const specializations = checkedValues<CoachSpecialization>(fd, 'specializations')

  return {
    // §5 Informasi Pribadi
    fullName: String(fd.get('fullName') ?? '').trim(),
    nik: String(fd.get('nik') ?? '').trim(),
    // Tanpa nilai bawaan — kosong dijaring validateCoachForm, bukan ditebak.
    gender: String(fd.get('gender') ?? '') as CoachGender,
    birthDate: String(fd.get('birthDate') ?? '').trim(),
    address: String(fd.get('address') ?? '').trim(),
    photoId: photoId ?? undefined,

    // §6 Informasi Kepelatihan
    coachStatus: String(fd.get('coachStatus') ?? 'AKTIF') as CoachStatus,
    coachingSince: integer(fd, 'coachingSince'),
    clubName: text(fd, 'clubName'),
    athleteCategories: checkedValues<AthleteCategory>(fd, 'athleteCategories'),
    activeAthletes: integer(fd, 'activeAthletes'),
    specializations,
    // Keterangan hanya dikirim selama "Lainnya" memang dipilih.
    otherSpecialization: specializations.includes('LAINNYA') ? text(fd, 'otherSpecialization') : undefined,

    // §7 Lisensi & Sertifikasi
    certificates,

    // §8 Kontak Pelatih
    whatsapp: String(fd.get('whatsapp') ?? '').trim(),
    email: text(fd, 'email'),
    instagram: text(fd, 'instagram'),
    acceptingNewAthletes: String(fd.get('acceptingNewAthletes') ?? '') === 'YA',

    // §9 Informasi Tambahan
    experience: text(fd, 'experience'),
  }
}

/** §17 — validasi dasar yang bisa dicek di browser sebelum menembak API. */
export function validateCoachForm(input: CoachFormInput): string | null {
  if (!input.fullName) return 'Nama lengkap wajib diisi.'
  if (!/^\d{16}$/.test(input.nik)) return 'NIK harus 16 digit angka.'
  if (!input.gender) return 'Jenis kelamin wajib dipilih.'
  if (!input.birthDate) return 'Tanggal lahir wajib diisi.'
  if (!input.address) return 'Alamat lengkap wajib diisi.'
  if (!input.whatsapp) return 'Nomor HP / WhatsApp wajib diisi.'
  if (input.specializations.includes('LAINNYA') && !input.otherSpecialization) {
    return 'Sebutkan spesialisasi lainnya.'
  }
  return null
}
