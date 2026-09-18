import type { Request } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { writeAuditLog } from '../../shared/utils/audit'
import { maskNik } from '../../shared/utils/mask-nik'
import { resolveAgeGroup } from '../../shared/utils/age-group'
import type {
  CreateCertificateInput,
  CreatePnpRankingInput,
  UpdatePnpRankingInput,
  CreateTrackRecordInput,
  UpdateCertificateInput,
  UpdateTrackRecordInput,
  UpdatePersonalInfoInput,
} from './players.schema'

const playerDetailInclude = {
  user: { select: { id: true } },
  district: { select: { id: true, name: true, code: true } },
  club: { select: { id: true, name: true } },
  ageGroupRef: true,
  photo: { select: { id: true, originalName: true, mimeType: true, size: true } },
  pnpRankings: { orderBy: { updatedAt: 'desc' as const } },
  trackRecords: { orderBy: [{ eventDate: 'desc' as const }, { createdAt: 'desc' as const }] },
  certificates: {
    orderBy: [{ issuedAt: 'desc' as const }, { createdAt: 'desc' as const }],
    include: { file: { select: { id: true, originalName: true, mimeType: true, size: true } } },
  },
  districtHistory: {
    orderBy: { changedAt: 'desc' as const },
    include: {
      fromDistrict: { select: { name: true } },
      toDistrict: { select: { name: true } },
    },
  },
}

function publicPlayerDetail(player: any, req: Request) {
  const { user: _user, nik, ...safePlayer } = player
  const showFullNik = isCentralAdmin(req) || Boolean(getDistrictScope(req))
  return { ...safePlayer, nik: showFullNik ? nik : nik ? maskNik(nik) : null }
}

export async function getPlayerDetail(playerId: string, req: Request) {
  const player = await prisma.player.findUnique({ where: { id: playerId }, include: playerDetailInclude })
  if (!player) throw AppError.notFound('Player not found')
  assertPlayerAccess(player.districtId, player.user?.id, req)

  const resolved = await resolveAgeGroup(player.birthDate, player.ageGroup, player.gender)
  const nextAgeGroupId = resolved?.id ?? null
  const nextAgeGroup = resolved?.code ?? null
  if (player.ageGroupId !== nextAgeGroupId || player.ageGroup !== nextAgeGroup) {
    await prisma.player.update({ where: { id: player.id }, data: { ageGroupId: nextAgeGroupId, ageGroup: nextAgeGroup } })
    player.ageGroupId = nextAgeGroupId
    player.ageGroup = nextAgeGroup
    player.ageGroupRef = resolved ? await prisma.ageGroup.findUnique({ where: { id: resolved.id } }) : null
  }

  return publicPlayerDetail(player, req)
}

/** Never persist a raw NIK into the audit trail. */
function auditIdentity(identity: { fullName: string; nik: string | null; gender: string | null; birthPlace: string | null; birthDate: Date | null; address: string | null; phone: string | null; instagram: string | null; whatsapp: string | null }) {
  return {
    fullName: identity.fullName,
    nik: identity.nik ? maskNik(identity.nik) : null,
    gender: identity.gender,
    birthPlace: identity.birthPlace,
    birthDate: identity.birthDate,
    address: identity.address,
    phone: identity.phone,
    instagram: identity.instagram,
    whatsapp: identity.whatsapp,
  }
}

export async function updatePersonalInfo(playerId: string, input: UpdatePersonalInfoInput, req: Request) {
  const player = await getScopedPlayer(playerId, req)
  const actorId = requireActor(req)
  const { confirmIdentityChange, ...changes } = input
  const oldPlayer = player

  // NIK and gender are identity fields: require the explicit confirmation flag
  // sent by the client's confirmation dialog, and admin-level authority.
  const touchesIdentity = changes.nik !== undefined || changes.gender !== undefined
  if (touchesIdentity) {
    if (!confirmIdentityChange) {
      throw AppError.badRequest('CONFIRMATION_REQUIRED', 'Perubahan data identitas memerlukan konfirmasi')
    }
    if (!isCentralAdmin(req) && !getDistrictScope(req)) {
      throw AppError.forbidden('Hanya admin yang dapat mengubah data identitas')
    }
  }

  // Player.nik and User.nik are separately unique — changing NIK must not
  // collide with either table.
  if (changes.nik && changes.nik !== oldPlayer.nik) {
    const [playerClash, userClash] = await Promise.all([
      prisma.player.findUnique({ where: { nik: changes.nik }, select: { id: true } }),
      prisma.user.findUnique({ where: { nik: changes.nik }, select: { id: true } }),
    ])
    if (playerClash) throw AppError.conflict('NIK_ALREADY_USED', 'NIK sudah digunakan pemain lain')
    if (userClash) throw AppError.conflict('NIK_ALREADY_USED', 'NIK sudah terhubung ke akun pengguna')
  }

  const updatedIdentity = await prisma.$transaction(async (tx) => {
    const updated = await tx.player.update({ where: { id: player.id }, data: changes })
    // Keep the linked account's NIK in sync when one exists.
    if (changes.nik && player.user?.id) {
      await tx.user.update({ where: { id: player.user.id }, data: { nik: changes.nik } })
    }
    return updated
  })

  const resolved = await resolveAgeGroup(updatedIdentity.birthDate, player.ageGroup, updatedIdentity.gender)
  const nextAgeGroupId = resolved?.id ?? null
  const nextAgeGroup = resolved?.code ?? null
  const updatedPlayer = (player.ageGroupId !== nextAgeGroupId || player.ageGroup !== nextAgeGroup)
    ? await prisma.player.update({
        where: { id: player.id },
        data: { ageGroupId: nextAgeGroupId, ageGroup: nextAgeGroup },
      })
    : player

  await writeAuditLog({
    actorId,
    action: touchesIdentity ? 'UPDATE_PLAYER_IDENTITY' : 'UPDATE_PERSONAL_INFO',
    entityType: 'PLAYER',
    entityId: player.id,
    districtId: player.districtId,
    oldValue: { identity: auditIdentity(oldPlayer), ageGroup: player.ageGroup },
    newValue: { identity: auditIdentity(updatedIdentity), ageGroup: updatedPlayer.ageGroup },
  })

  return getPlayerDetail(playerId, req)
}

/**
 * Request an affiliation transfer to another district.
 * Creates a PENDING DISTRICT_TRANSFER verification owned by the TARGET
 * district, so the receiving district admin resolves it from Review Pendaftaran.
 */
export async function requestTransfer(playerId: string, toDistrictId: string, req: Request) {
  const player = await getScopedPlayer(playerId, req)
  const actorId = requireActor(req)

  if (player.districtId === toDistrictId) {
    throw AppError.badRequest('SAME_DISTRICT', 'Pemain sudah terdaftar di kabupaten tujuan')
  }

  const target = await prisma.district.findUnique({ where: { id: toDistrictId } })
  if (!target) throw AppError.notFound('Kabupaten tujuan tidak ditemukan')

  // A district admin may only initiate a transfer for a player in their own
  // district. Central admin may initiate any transfer.
  if (!isCentralAdmin(req) && player.districtId !== getDistrictScope(req)) {
    throw AppError.forbidden('Pemain berada di luar cakupan kabupaten Anda')
  }

  const pending = await prisma.verificationRequest.findFirst({
    where: { entityType: 'DISTRICT_TRANSFER', status: 'PENDING', entityId: player.id },
  })
  if (pending) throw AppError.conflict('TRANSFER_PENDING', 'Sudah ada permintaan transfer yang menunggu tinjauan')

  const fromDistrict = await prisma.district.findUnique({ where: { id: player.districtId }, select: { name: true, code: true } })

  const request = await prisma.verificationRequest.create({
    data: {
      entityType: 'DISTRICT_TRANSFER',
      entityId: player.id,
      level: 'DISTRICT',
      status: 'PENDING',
      districtId: toDistrictId,
      requestedBy: actorId,
      payload: {
        playerId: player.id,
        playerCode: player.playerCode,
        fullName: player.fullName,
        fromDistrictId: player.districtId,
        fromDistrictName: fromDistrict?.name ?? null,
        toDistrictId,
        toDistrictName: target.name,
      },
    },
  })

  await writeAuditLog({
    actorId,
    action: 'REQUEST_DISTRICT_TRANSFER',
    entityType: 'PLAYER',
    entityId: player.id,
    districtId: player.districtId,
    newValue: { toDistrictId, verificationRequestId: request.id },
  })

  return request
}

export async function getScopedPlayer(playerId: string, req: Request) {
  const player = await prisma.player.findUnique({ where: { id: playerId }, include: { user: { select: { id: true } } } })
  if (!player) throw AppError.notFound('Player not found')
  assertPlayerAccess(player.districtId, player.user?.id, req)
  return player
}

function assertPlayerAccess(districtId: string, playerUserId: string | null | undefined, req: Request) {
  const isAdmin = isCentralAdmin(req) || Boolean(getDistrictScope(req))
  const isInDistrict = isCentralAdmin(req) || districtId === getDistrictScope(req)
  const isOwnPlayer = req.auth?.roles.some((role) => role.role === 'PLAYER') && playerUserId === req.auth?.userId
  if ((!isAdmin || !isInDistrict) && !isOwnPlayer) throw AppError.forbidden('Out of scope')
}

function requireActor(req: Request) {
  if (!req.auth?.userId) throw AppError.unauthorized()
  return req.auth.userId
}

async function assertFileAvailable(fileId: string | null | undefined, actorId: string) {
  if (!fileId) return
  const file = await prisma.file.findUnique({ where: { id: fileId }, include: { certificate: { select: { id: true } } } })
  if (!file) throw AppError.badRequest('FILE_NOT_FOUND', 'Certificate file not found')
  if (file.uploadedBy !== actorId) throw AppError.forbidden('Certificate file is not owned by the current user')
  if (file.certificate) throw AppError.conflict('FILE_ALREADY_ATTACHED', 'File is already attached to a certificate')
}

export async function listPnpRankings(playerId: string, req: Request) {
  await getScopedPlayer(playerId, req)
  return prisma.playerPnpRanking.findMany({ where: { playerId }, orderBy: { updatedAt: 'desc' } })
}

export async function listTrackRecords(playerId: string, req: Request) {
  await getScopedPlayer(playerId, req)
  return prisma.playerTrackRecord.findMany({
    where: { playerId },
    orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function listCertificates(playerId: string, req: Request) {
  await getScopedPlayer(playerId, req)
  return prisma.playerCertificate.findMany({
    where: { playerId },
    orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
    include: { file: { select: { id: true, originalName: true, mimeType: true, size: true } } },
  })
}

export async function appendPnpRanking(playerId: string, input: CreatePnpRankingInput, req: Request) {
  const player = await getScopedPlayer(playerId, req)
  const actorId = requireActor(req)
  const ranking = await prisma.playerPnpRanking.create({
    data: { playerId, rank: input.rank, period: input.period, updatedBy: actorId },
  })
  await writeAuditLog({
    actorId,
    action: 'APPEND_PNP_RANKING',
    entityType: 'PLAYER_PNP_RANKING',
    entityId: ranking.id,
    districtId: player.districtId,
    newValue: { playerId, rank: ranking.rank, period: ranking.period },
  })
  return ranking
}

export async function updatePnpRanking(playerId: string, rankingId: string, input: UpdatePnpRankingInput, req: Request) {
  const player = await getScopedPlayer(playerId, req)
  const ranking = await prisma.playerPnpRanking.findFirst({ where: { id: rankingId, playerId } })
  if (!ranking) throw AppError.notFound('PNP ranking not found')
  const actorId = requireActor(req)
  const updated = await prisma.playerPnpRanking.update({ where: { id: rankingId }, data: { ...input, updatedBy: actorId } })
  await writeAuditLog({
    actorId,
    action: 'UPDATE_PNP_RANKING',
    entityType: 'PLAYER_PNP_RANKING',
    entityId: ranking.id,
    districtId: player.districtId,
    oldValue: ranking,
    newValue: updated,
  })
  return updated
}

export async function deletePnpRanking(playerId: string, rankingId: string, req: Request) {
  const player = await getScopedPlayer(playerId, req)
  const ranking = await prisma.playerPnpRanking.findFirst({ where: { id: rankingId, playerId } })
  if (!ranking) throw AppError.notFound('PNP ranking not found')
  const actorId = requireActor(req)
  await prisma.playerPnpRanking.delete({ where: { id: rankingId } })
  await writeAuditLog({
    actorId,
    action: 'DELETE_PNP_RANKING',
    entityType: 'PLAYER_PNP_RANKING',
    entityId: ranking.id,
    districtId: player.districtId,
    oldValue: ranking,
  })
  return { id: ranking.id }
}

export async function createTrackRecord(playerId: string, input: CreateTrackRecordInput, req: Request) {
  const player = await getScopedPlayer(playerId, req)
  const actorId = requireActor(req)
  const record = await prisma.playerTrackRecord.create({ data: { ...input, playerId, createdBy: actorId } })
  await writeAuditLog({
    actorId,
    action: 'CREATE_PLAYER_TRACK_RECORD',
    entityType: 'PLAYER_TRACK_RECORD',
    entityId: record.id,
    districtId: player.districtId,
    newValue: record,
  })
  return record
}

export async function updateTrackRecord(playerId: string, recordId: string, input: UpdateTrackRecordInput, req: Request) {
  const player = await getScopedPlayer(playerId, req)
  const record = await prisma.playerTrackRecord.findFirst({ where: { id: recordId, playerId } })
  if (!record) throw AppError.notFound('Track record not found')
  const actorId = requireActor(req)
  const updated = await prisma.playerTrackRecord.update({ where: { id: recordId }, data: input })
  await writeAuditLog({
    actorId,
    action: 'UPDATE_PLAYER_TRACK_RECORD',
    entityType: 'PLAYER_TRACK_RECORD',
    entityId: record.id,
    districtId: player.districtId,
    oldValue: record,
    newValue: updated,
  })
  return updated
}

export async function deleteTrackRecord(playerId: string, recordId: string, req: Request) {
  const player = await getScopedPlayer(playerId, req)
  const record = await prisma.playerTrackRecord.findFirst({ where: { id: recordId, playerId } })
  if (!record) throw AppError.notFound('Track record not found')
  const actorId = requireActor(req)
  await prisma.playerTrackRecord.delete({ where: { id: recordId } })
  await writeAuditLog({
    actorId,
    action: 'DELETE_PLAYER_TRACK_RECORD',
    entityType: 'PLAYER_TRACK_RECORD',
    entityId: record.id,
    districtId: player.districtId,
    oldValue: record,
  })
  return { id: record.id }
}

async function assertTrackRecordBelongsToPlayer(playerId: string, trackRecordId: string | null | undefined) {
  if (!trackRecordId) return
  const record = await prisma.playerTrackRecord.findFirst({ where: { id: trackRecordId, playerId }, select: { id: true } })
  if (!record) throw AppError.badRequest('TRACK_RECORD_NOT_FOUND', 'Track record does not belong to this player')
}

export async function createCertificate(playerId: string, input: CreateCertificateInput, req: Request) {
  const player = await getScopedPlayer(playerId, req)
  const actorId = requireActor(req)
  await assertFileAvailable(input.fileId, actorId)
  await assertTrackRecordBelongsToPlayer(playerId, input.trackRecordId)
  const certificate = await prisma.playerCertificate.create({
    data: { ...input, playerId, createdBy: actorId },
    include: { file: { select: { id: true, originalName: true, mimeType: true, size: true } } },
  })
  if (input.fileId) {
    await prisma.file.update({ where: { id: input.fileId }, data: { entityType: 'PLAYER_CERTIFICATE', entityId: certificate.id } })
  }
  await writeAuditLog({
    actorId,
    action: 'CREATE_PLAYER_CERTIFICATE',
    entityType: 'PLAYER_CERTIFICATE',
    entityId: certificate.id,
    districtId: player.districtId,
    newValue: certificate,
  })
  return certificate
}

export async function updateCertificate(playerId: string, certificateId: string, input: UpdateCertificateInput, req: Request) {
  const player = await getScopedPlayer(playerId, req)
  const certificate = await prisma.playerCertificate.findFirst({ where: { id: certificateId, playerId }, include: { file: true } })
  if (!certificate) throw AppError.notFound('Certificate not found')
  const actorId = requireActor(req)
  if (input.fileId !== undefined && input.fileId !== certificate.fileId) await assertFileAvailable(input.fileId, actorId)
  await assertTrackRecordBelongsToPlayer(playerId, input.trackRecordId)
  const updated = await prisma.playerCertificate.update({
    where: { id: certificateId },
    data: input,
    include: { file: { select: { id: true, originalName: true, mimeType: true, size: true } } },
  })
  if (input.fileId !== undefined && input.fileId !== certificate.fileId) {
    if (certificate.fileId) await prisma.file.update({ where: { id: certificate.fileId }, data: { entityType: 'GENERAL', entityId: null } })
    if (input.fileId) await prisma.file.update({ where: { id: input.fileId }, data: { entityType: 'PLAYER_CERTIFICATE', entityId: certificateId } })
  }
  await writeAuditLog({
    actorId,
    action: 'UPDATE_PLAYER_CERTIFICATE',
    entityType: 'PLAYER_CERTIFICATE',
    entityId: certificate.id,
    districtId: player.districtId,
    oldValue: certificate,
    newValue: updated,
  })
  return updated
}

export async function deleteCertificate(playerId: string, certificateId: string, req: Request) {
  const player = await getScopedPlayer(playerId, req)
  const certificate = await prisma.playerCertificate.findFirst({ where: { id: certificateId, playerId }, include: { file: true } })
  if (!certificate) throw AppError.notFound('Certificate not found')
  const actorId = requireActor(req)
  await prisma.playerCertificate.delete({ where: { id: certificateId } })
  if (certificate.fileId) await prisma.file.update({ where: { id: certificate.fileId }, data: { entityType: 'GENERAL', entityId: null } })
  await writeAuditLog({
    actorId,
    action: 'DELETE_PLAYER_CERTIFICATE',
    entityType: 'PLAYER_CERTIFICATE',
    entityId: certificate.id,
    districtId: player.districtId,
    oldValue: certificate,
  })
  return { id: certificate.id }
}

export async function updatePlayerStatus(playerId: string, status: 'VERIFIED' | 'ACTIVE' | 'INACTIVE', req: Request) {
  const player = await getScopedPlayer(playerId, req)
  if (!isCentralAdmin(req) && player.districtId !== getDistrictScope(req)) {
    throw AppError.forbidden('Out of district scope')
  }
  if (!['VERIFIED', 'ACTIVE', 'INACTIVE'].includes(player.status)) {
    throw AppError.badRequest('INVALID_STATUS_TRANSITION', 'Pemain harus disetujui melalui review pendaftaran terlebih dahulu')
  }
  const actorId = requireActor(req)
  return prisma.$transaction(async (tx) => {
    const updated = await tx.player.update({ where: { id: playerId }, data: { status } })
    await tx.auditLog.create({ data: {
      actorId, action: 'UPDATE_PLAYER_STATUS', entityType: 'PLAYER', entityId: playerId,
      districtId: player.districtId, oldValue: { status: player.status }, newValue: { status },
    } })
    return { id: updated.id, status: updated.status }
  })
}
