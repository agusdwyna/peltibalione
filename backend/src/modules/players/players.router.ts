import { Router } from 'express'
import type { PlayerStatus, Prisma } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { prisma } from '../../shared/database/prisma'
import { validate } from '../../shared/middleware/validate'
import { paginationArgs, paginatedResponse, paginationSchema } from '../../shared/utils/pagination'
import { resolveAgeGroup } from '../../shared/utils/age-group'
import {
  createCertificate,
  createTrackRecord,
  appendPnpRanking,
  updatePnpRanking,
  deletePnpRanking,
  listCertificates,
  listPnpRankings,
  listTrackRecords,
  deleteCertificate,
  deleteTrackRecord,
  getPlayerDetail,
  updateCertificate,
  updateTrackRecord,
  updatePersonalInfo,
  updatePlayerStatus,
  requestTransfer,
} from './players.service'
import {
  createCertificateSchema,
  createPnpRankingSchema,
  updatePnpRankingSchema,
  createTrackRecordSchema,
  playerChildParamsSchema,
  playerIdSchema,
  updateCertificateSchema,
  updateTrackRecordSchema,
  updatePersonalInfoSchema,
  updatePlayerStatusSchema,
  transferPlayerSchema,
} from './players.schema'

export const playersRouter = Router()

playersRouter.use(authenticate)

const playerReadAndMutationRoles = authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN', 'PLAYER'] })

// GET /api/players — list players (admins only, scope-aware)
playersRouter.get('/', authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }), async (req, res, next) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query)
    const central = isCentralAdmin(req)
    const districtId = getDistrictScope(req)
    if (!central && !districtId) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'District scope required' } })

    const filterDistrict = central && req.query.districtId ? String(req.query.districtId) : undefined
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    const gender = req.query.gender === 'PUTRA' || req.query.gender === 'PUTRI' ? req.query.gender : undefined
    const ageGroup = typeof req.query.ageGroup === 'string' ? req.query.ageGroup.trim() : ''
    const officialStatuses = { in: ['VERIFIED', 'ACTIVE', 'INACTIVE'] as PlayerStatus[] }
    const scopeWhere = central ? (filterDistrict ? { districtId: filterDistrict } : {}) : { districtId: districtId! }
    const where: Prisma.PlayerWhereInput = {
      ...scopeWhere,
      status: officialStatuses,
      ...(search || gender ? { ...(search ? { fullName: { contains: search, mode: 'insensitive' as const } } : {}), ...(gender ? { gender } : {}) } : {}),
      ...(ageGroup ? { ageGroup } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.player.findMany({
        where,
        ...paginationArgs({ page, pageSize }),
        orderBy: { createdAt: 'desc' },
        include: {
          district: { select: { name: true, code: true } },
          club: { select: { name: true } },
        },
      }),
      prisma.player.count({ where }),
    ])

    const synced = await Promise.all(data.map(async (player) => {
      const resolved = await resolveAgeGroup(player.birthDate, player.ageGroup, player.gender)
      const nextAgeGroupId = resolved?.id ?? null
      const nextAgeGroup = resolved?.code ?? null
      if (player.ageGroupId !== nextAgeGroupId || player.ageGroup !== nextAgeGroup) {
        await prisma.player.update({ where: { id: player.id }, data: { ageGroupId: nextAgeGroupId, ageGroup: nextAgeGroup } })
        return { ...player, ageGroupId: nextAgeGroupId, ageGroup: nextAgeGroup }
      }
      return player
    }))

    // Administrators are authorized to view full NIK (PRD: data pemilik wewenang).
    res.json(paginatedResponse(synced, total, { page, pageSize }))
  } catch (err) {
    next(err)
  }
})

// POST /api/players/:id/transfer — request affiliation transfer to another district
playersRouter.post('/:id/transfer', authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }), validate(playerIdSchema, 'params'), validate(transferPlayerSchema), async (req, res, next) => {
  try {
    res.status(201).json({ data: await requestTransfer(String(req.params.id), req.body.toDistrictId, req) })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/players/:id — allowlisted personal information only
playersRouter.patch('/:id', playerReadAndMutationRoles, validate(playerIdSchema, 'params'), validate(updatePersonalInfoSchema), async (req, res, next) => {
  try {
    res.json({ data: await updatePersonalInfo(String(req.params.id), req.body, req) })
  } catch (err) {
    next(err)
  }
})

// GET /api/players/:id — full player detail, still district scoped and with masked NIK
playersRouter.get('/:id', playerReadAndMutationRoles, validate(playerIdSchema, 'params'), async (req, res, next) => {
  try {
    res.json(await getPlayerDetail(String(req.params.id), req))
  } catch (err) {
    next(err)
  }
})

playersRouter.get('/:id/pnp-rankings', playerReadAndMutationRoles, validate(playerIdSchema, 'params'), async (req, res, next) => {
  try {
    res.json({ data: await listPnpRankings(String(req.params.id), req) })
  } catch (err) {
    next(err)
  }
})

playersRouter.post('/:id/pnp-rankings', playerReadAndMutationRoles, validate(playerIdSchema, 'params'), validate(createPnpRankingSchema), async (req, res, next) => {
  try {
    res.status(201).json({ data: await appendPnpRanking(String(req.params.id), req.body, req) })
  } catch (err) {
    next(err)
  }
})

playersRouter.patch('/:id/pnp-rankings/:childId', playerReadAndMutationRoles, validate(playerChildParamsSchema, 'params'), validate(updatePnpRankingSchema), async (req, res, next) => {
  try {
    res.json({ data: await updatePnpRanking(String(req.params.id), String(req.params.childId), req.body, req) })
  } catch (err) {
    next(err)
  }
})

playersRouter.delete('/:id/pnp-rankings/:childId', playerReadAndMutationRoles, validate(playerChildParamsSchema, 'params'), async (req, res, next) => {
  try {
    res.json({ data: await deletePnpRanking(String(req.params.id), String(req.params.childId), req) })
  } catch (err) {
    next(err)
  }
})

playersRouter.get('/:id/track-records', playerReadAndMutationRoles, validate(playerIdSchema, 'params'), async (req, res, next) => {
  try {
    res.json({ data: await listTrackRecords(String(req.params.id), req) })
  } catch (err) {
    next(err)
  }
})

playersRouter.post('/:id/track-records', playerReadAndMutationRoles, validate(playerIdSchema, 'params'), validate(createTrackRecordSchema), async (req, res, next) => {
  try {
    res.status(201).json({ data: await createTrackRecord(String(req.params.id), req.body, req) })
  } catch (err) {
    next(err)
  }
})

playersRouter.patch('/:id/track-records/:childId', playerReadAndMutationRoles, validate(playerChildParamsSchema, 'params'), validate(updateTrackRecordSchema), async (req, res, next) => {
  try {
    res.json({ data: await updateTrackRecord(String(req.params.id), String(req.params.childId), req.body, req) })
  } catch (err) {
    next(err)
  }
})

playersRouter.delete('/:id/track-records/:childId', playerReadAndMutationRoles, validate(playerChildParamsSchema, 'params'), async (req, res, next) => {
  try {
    res.json({ data: await deleteTrackRecord(String(req.params.id), String(req.params.childId), req) })
  } catch (err) {
    next(err)
  }
})

playersRouter.get('/:id/certificates', playerReadAndMutationRoles, validate(playerIdSchema, 'params'), async (req, res, next) => {
  try {
    res.json({ data: await listCertificates(String(req.params.id), req) })
  } catch (err) {
    next(err)
  }
})

playersRouter.post('/:id/certificates', playerReadAndMutationRoles, validate(playerIdSchema, 'params'), validate(createCertificateSchema), async (req, res, next) => {
  try {
    res.status(201).json({ data: await createCertificate(String(req.params.id), req.body, req) })
  } catch (err) {
    next(err)
  }
})

playersRouter.patch('/:id/certificates/:childId', playerReadAndMutationRoles, validate(playerChildParamsSchema, 'params'), validate(updateCertificateSchema), async (req, res, next) => {
  try {
    res.json({ data: await updateCertificate(String(req.params.id), String(req.params.childId), req.body, req) })
  } catch (err) {
    next(err)
  }
})

playersRouter.delete('/:id/certificates/:childId', playerReadAndMutationRoles, validate(playerChildParamsSchema, 'params'), async (req, res, next) => {
  try {
    res.json({ data: await deleteCertificate(String(req.params.id), String(req.params.childId), req) })
  } catch (err) {
    next(err)
  }
})

playersRouter.patch('/:id/status', authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }), validate(playerIdSchema, 'params'), validate(updatePlayerStatusSchema), async (req, res, next) => {
  try {
    res.json({ data: await updatePlayerStatus(String(req.params.id), req.body.status, req) })
  } catch (err) {
    next(err)
  }
})
