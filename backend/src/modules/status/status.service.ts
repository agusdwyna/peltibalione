import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'

/**
 * Peran yang dapat dicari lewat NIK.
 *
 * Satpras sengaja tidak termasuk: lapangan itu benda, bukan orang, jadi
 * identitasnya nama + alamat — bukan NIK. Lihat searchFacilities().
 */
export type StatusRole = 'PLAYER' | 'COACH' | 'OFFICIAL'

export type StatusEntry = {
  role: StatusRole
  /** Nama sesuai data yang tersimpan, bukan ejaan yang diketik pencari. */
  fullName: string
  /** Kode resmi dari master (PL-/CO-/RF-). Kosong bila belum sampai tahap itu. */
  code: string | null
  /**
   * Status verifikasi di tabel master. Pemain memakai PlayerStatus
   * (VERIFIED/ACTIVE/…), pelatih & wasit memakai TERVERIFIKASI. Kosong bila
   * pengajuan belum menghasilkan record master.
   */
  verification: string | null
  /** Status pengajuan terakhir — tetap terbaca walau master belum terbentuk. */
  submissionStatus: string | null
  district: { name: string; code: string } | null
  rejectionReason?: string
  /**
   * Hanya terisi untuk PLAYER, dan hanya bila record master sudah ada.
   * Dipakai tombol "Buat Akun" — pembuatan akun mensyaratkan pemain VERIFIED.
   */
  playerId?: string
}

const DISTRICT_SELECT = { select: { name: true, code: true } } as const

/**
 * Cek status pendaftaran by NIK + Nama lengkap (publik, tanpa autentikasi).
 *
 * Satu NIK boleh terdaftar di beberapa peran sekaligus — PRD §4.3 memang
 * meminta model data mendukung multi-role sejak awal. Karena itu hasilnya
 * berupa daftar peran, bukan satu status tunggal.
 *
 * Untuk tiap peran diperiksa dua sumber: tabel submission (pengajuan yang
 * mungkin masih menunggu) dan tabel master (pengajuan yang sudah disetujui).
 * Keduanya diperlukan — pengajuan yang baru masuk belum punya record master,
 * sedangkan record master hasil migrasi lama bisa saja tanpa submission.
 *
 * Nama yang dikembalikan selalu diambil dari data tersimpan, tidak pernah dari
 * input pencari: kalau ejaan yang diketik dipakai, respons ini jadi alat untuk
 * menebak ejaan nama pemilik NIK tertentu.
 */
export async function checkStatus(nik: string, fullName: string) {
  const nameWhere = { nik, fullName: { equals: fullName, mode: 'insensitive' } } as const

  const [playerSubmission, coachSubmission, officialSubmission, player, coach, official] = await Promise.all([
    prisma.playerSubmission.findFirst({
      where: nameWhere,
      orderBy: { createdAt: 'desc' },
      select: { status: true, fullName: true, rejectionReason: true },
    }),
    prisma.coachSubmission.findFirst({
      where: nameWhere,
      orderBy: { createdAt: 'desc' },
      select: { status: true, fullName: true, rejectionReason: true },
    }),
    prisma.officialSubmission.findFirst({
      where: nameWhere,
      orderBy: { createdAt: 'desc' },
      select: { status: true, fullName: true, rejectionReason: true },
    }),
    prisma.player.findUnique({
      where: { nik },
      select: { id: true, playerCode: true, fullName: true, status: true, district: DISTRICT_SELECT },
    }),
    prisma.coach.findUnique({
      where: { nik },
      select: { coachCode: true, fullName: true, verificationStatus: true, district: DISTRICT_SELECT },
    }),
    prisma.official.findUnique({
      where: { nik },
      select: { officialCode: true, fullName: true, verificationStatus: true, district: DISTRICT_SELECT },
    }),
  ])

  const entries: StatusEntry[] = []

  // Tiap peran punya bentuk yang sama: pakai record master bila ada, jika tidak
  // jatuh ke pengajuan yang belum disetujui. Perbedaan enum status antar peran
  // dibiarkan apa adanya — UI yang menerjemahkannya.
  if (player) {
    entries.push({
      role: 'PLAYER',
      fullName: player.fullName,
      code: player.playerCode,
      verification: player.status,
      submissionStatus: playerSubmission?.status ?? null,
      district: player.district,
      rejectionReason: playerSubmission?.rejectionReason ?? undefined,
      playerId: player.id,
    })
  } else if (playerSubmission) {
    entries.push({
      role: 'PLAYER',
      fullName: playerSubmission.fullName,
      code: null,
      verification: null,
      submissionStatus: playerSubmission.status,
      district: null,
      rejectionReason: playerSubmission.rejectionReason ?? undefined,
    })
  }

  if (coach) {
    entries.push({
      role: 'COACH',
      fullName: coach.fullName,
      code: coach.coachCode,
      verification: coach.verificationStatus,
      submissionStatus: coachSubmission?.status ?? null,
      district: coach.district,
      rejectionReason: coachSubmission?.rejectionReason ?? undefined,
    })
  } else if (coachSubmission) {
    entries.push({
      role: 'COACH',
      fullName: coachSubmission.fullName,
      code: null,
      verification: null,
      submissionStatus: coachSubmission.status,
      district: null,
      rejectionReason: coachSubmission.rejectionReason ?? undefined,
    })
  }

  if (official) {
    entries.push({
      role: 'OFFICIAL',
      fullName: official.fullName,
      code: official.officialCode,
      verification: official.verificationStatus,
      submissionStatus: officialSubmission?.status ?? null,
      district: official.district,
      rejectionReason: officialSubmission?.rejectionReason ?? undefined,
    })
  } else if (officialSubmission) {
    entries.push({
      role: 'OFFICIAL',
      fullName: officialSubmission.fullName,
      code: null,
      verification: null,
      submissionStatus: officialSubmission.status,
      district: null,
      rejectionReason: officialSubmission.rejectionReason ?? undefined,
    })
  }

  if (entries.length === 0) {
    throw AppError.notFound('Data tidak ditemukan. Periksa kembali NIK dan Nama Lengkap.')
  }

  return { nik, roles: entries }
}

/**
 * Pencarian data lapangan untuk publik (publik, tanpa autentikasi).
 *
 * Kuncinya nama lapangan, bukan NIK — lapangan tidak punya identitas orang.
 * Hanya lapangan TERVERIFIKASI yang ditampilkan, sejalan dengan peta publik
 * dan endpoint overview kabupaten/kota, sehingga data yang masih ditinjau
 * tidak bocor lewat jalur ini.
 *
 * Tidak ada field pribadi di sini: pengelola dan PIC (nama, nomor HP) sengaja
 * tidak diambil, sama seperti endpoint overview.
 */
export async function searchFacilities(query: string) {
  const facilities = await prisma.facility.findMany({
    where: {
      verificationStatus: 'TERVERIFIKASI',
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
    take: 20,
    select: {
      facilityCode: true,
      name: true,
      address: true,
      courtCount: true,
      courtType: true,
      grade: true,
      openTime: true,
      closeTime: true,
      district: DISTRICT_SELECT,
    },
  })

  return { query, facilities }
}

/**
 * Membuat akun pengguna secara otomatis untuk pemain yang sudah VERIFIED.
 * Sistem generate: email dari playerCode + password random 8 karakter.
 * User di-link langsung ke Player (playerId) dan mendapat role PLAYER.
 */
export async function createAccountForPlayer(playerId: string, nik: string, fullName: string) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { district: true },
  })
  if (!player) throw AppError.notFound('Pemain tidak ditemukan.')
  if (player.status !== 'VERIFIED') {
    throw AppError.badRequest('NOT_VERIFIED', 'Pemain belum terverifikasi. Tidak dapat membuat akun.')
  }
  if (player.nik !== nik || player.fullName.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
    throw AppError.forbidden('Data identitas tidak cocok.')
  }

  // Cek apakah pemain sudah memiliki akun
  const existingUser = await prisma.user.findUnique({ where: { playerId } })
  if (existingUser) {
    throw AppError.conflict('ACCOUNT_EXISTS', 'Akun sudah tersedia untuk pemain ini. Silakan login.')
  }

  const email = `${player.playerCode.toLowerCase()}@peltibali.id`
  const password = randomBytes(6).toString('base64url').slice(0, 10)
  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name: player.fullName,
        passwordHash,
        nik: player.nik,
        playerId: player.id,
      },
    })
    await tx.userRole.create({
      data: { userId: created.id, role: 'PLAYER', districtId: player.districtId },
    })
    return created
  })

  await writeAuditLog({
    actorId: user.id,
    action: 'ACTIVATE_PLAYER_ACCOUNT',
    entityType: 'PLAYER',
    entityId: player.id,
    districtId: player.districtId,
    newValue: { userId: user.id, email },
  })

  return { email, password, name: player.fullName }
}
