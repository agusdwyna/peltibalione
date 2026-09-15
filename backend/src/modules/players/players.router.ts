import { Router } from 'express'
import type { PlayerStatus } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { prisma } from '../../shared/database/prisma'
import { validate } from '../../shared/middleware/validate'
import { paginationArgs, paginatedResponse, paginationSchema } from '../../shared/utils/pagination'
import { maskNik } from '../../shared/utils/mask-nik'
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
    const officialStatuses = { in: ['VERIFIED', 'ACTIVE', 'INACTIVE'] as PlayerStatus[] }
    const scopeWhere = central ? (filterDistrict ? { districtId: filterDistrict } : {}) : { districtId: districtId! }
    const where = {
      ...scopeWhere,
      status: officialStatuses,
      ...(search ? { person: { fullName: { contains: search, mode: 'insensitive' as const } } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.player.findMany({
        where,
        ...paginationArgs({ page, pageSize }),
        orderBy: { createdAt: 'desc' },
        include: {
          person: { select: { fullName: true, nik: true } },
          district: { select: { name: true, code: true } },
          club: { select: { name: true } },
        },
      }),
      prisma.player.count({ where }),
    ])

    res.json(paginatedResponse(data.map((player) => ({ ...player, person: { ...player.person, nik: player.person.nik ? maskNik(player.person.nik) : null } })), total, { page, pageSize }))
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
