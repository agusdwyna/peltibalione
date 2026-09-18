import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { writeAuditLog } from '../../shared/utils/audit'

/**
 * Check status pendaftaran pemain by NIK + Nama lengkap (public, no auth).
 * Cari PlayerSubmission → dapat status terkini + playerId jika sudah dibuat.
 */
export async function checkStatus(nik: string, fullName: string) {
  const submission = await prisma.playerSubmission.findFirst({
    where: { nik, fullName: { mode: 'insensitive', equals: fullName } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      fullName: true,
      duplicateMatch: true,
      playerId: true,
      rejectionReason: true,
      createdAt: true,
    },
  })
  if (!submission) {
    throw AppError.notFound('Data tidak ditemukan. Periksa kembali NIK dan Nama Lengkap.')
  }

  let playerStatus: string | null = null
  let playerCode: string | null = null
  let district: { name: string; code: string } | null = null
  if (submission.playerId) {
    const player = await prisma.player.findUnique({
      where: { id: submission.playerId },
      select: {
        status: true,
        playerCode: true,
        district: { select: { name: true, code: true } },
      },
    })
    playerStatus = player?.status ?? null
    if (player) {
      playerCode = player.playerCode
      district = player.district
    }
  }

  return {
    submissionId: submission.id,
    fullName: submission.fullName,
    submissionStatus: submission.status,
    playerStatus,
    playerId: submission.playerId,
    playerCode,
    district,
    rejectionReason: submission.rejectionReason ?? undefined,
    createdAt: submission.createdAt,
  }
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