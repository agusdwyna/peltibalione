import type {
  OfficialCertificateInput,
  OfficialFormInput,
  OfficialGender,
  OfficialLevel,
  OfficialRole,
  OfficialStatus,
  OfficialTournamentInput,
} from '../../types/official'

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

/** Rakit payload wasit dari FormData + state foto, sertifikat, dan turnamen. */
export function readOfficialForm(
  fd: FormData,
  photoId: string | null,
  certificates: OfficialCertificateInput[],
  tournaments: OfficialTournamentInput[],
): OfficialFormInput {
  return {
    // §4 Informasi Pribadi
    fullName: String(fd.get('fullName') ?? '').trim(),
    nik: String(fd.get('nik') ?? '').trim(),
    // Tanpa nilai bawaan — kosong dijaring validateOfficialForm, bukan ditebak.
    gender: String(fd.get('gender') ?? '') as OfficialGender,
    birthDate: String(fd.get('birthDate') ?? '').trim(),
    address: String(fd.get('address') ?? '').trim(),
    photoId: photoId ?? undefined,

    // §5 Informasi Kewasitan — jumlah turnamen tidak dikirim, dihitung server
    // dari daftar riwayat turnamen.
    officialStatus: String(fd.get('officialStatus') ?? 'AKTIF') as OfficialStatus,
    officiatingSince: integer(fd, 'officiatingSince'),
    roles: checkedValues<OfficialRole>(fd, 'roles'),
    level: (text(fd, 'level') as OfficialLevel | undefined) ?? undefined,

    // §6 Lisensi & §7 Riwayat Turnamen
    certificates,
    tournaments,

    // §8 Kontak Wasit
    whatsapp: String(fd.get('whatsapp') ?? '').trim(),
    email: text(fd, 'email'),
    instagram: text(fd, 'instagram'),
    acceptingAssignments: String(fd.get('acceptingAssignments') ?? '') === 'YA',

    // §9 Informasi Tambahan
    experience: text(fd, 'experience'),
  }
}

/** §16 — validasi dasar yang bisa dicek di browser sebelum menembak API. */
export function validateOfficialForm(input: OfficialFormInput): string | null {
  if (!input.fullName) return 'Nama lengkap wajib diisi.'
  if (!/^\d{16}$/.test(input.nik)) return 'NIK harus 16 digit angka.'
  if (!input.gender) return 'Jenis kelamin wajib dipilih.'
  if (!input.birthDate) return 'Tanggal lahir wajib diisi.'
  if (!input.address) return 'Alamat lengkap wajib diisi.'
  // §4 — foto profil wasit wajib, berbeda dengan master pelatih.
  if (!input.photoId) return 'Foto profil wajib diunggah.'
  if (!input.officiatingSince) return 'Tahun menjadi wasit wajib diisi.'
  if (!input.roles.length) return 'Pilih minimal satu peran wasit.'
  if (!input.whatsapp) return 'Nomor HP / WhatsApp wajib diisi.'
  return null
}
