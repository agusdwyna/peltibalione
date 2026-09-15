import { Router } from 'express'
import type { PlayerStatus } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { prisma } from '../../shared/database/prisma'
import { paginationArgs, paginatedResponse, paginationSchema } from '../../shared/utils/pagination'
export const playersRouter = Router()

playersRouter.use(authenticate)

// GET /api/players — list players (admins only, scope-aware; PLAYER cannot list others)
playersRouter.get('/', authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }), async (req, res, next) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query)
    const central = isCentralAdmin(req)
    const districtId = getDistrictScope(req)

    if (!central && !districtId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'District scope required' } })
    }

    // CENTRAL_ADMIN can optionally narrow to one district (workspace context filter).
    // DISTRICT_ADMIN is always locked to their own district — the filter cannot widen scope.
    const filterDistrict = central && req.query.districtId ? String(req.query.districtId) : undefined
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    const officialStatuses = { in: ['VERIFIED', 'ACTIVE', 'INACTIVE'] as PlayerStatus[] }
    const scopeWhere = central
      ? (filterDistrict ? { districtId: filterDistrict } : {})
      : { districtId: districtId! }
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
          // PRD §36 — phone is sensitive; omit from list. NIK masked at mapping below.
          person: { select: { fullName: true, nik: true } },
          district: { select: { name: true, code: true } },
          club: { select: { name: true } },
        },
      }),
      prisma.player.count({ where }),
    ])

    res.json(paginatedResponse(data, total, { page, pageSize }))
  } catch (err) {
    next(err)
  }
})

// GET /api/players/:id — single player (admin district-scoped, PLAYER self-only)
playersRouter.get('/:id', async (req, res, next) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.params.id },
      include: {
        // include person.user.id to test self-ownership for PLAYER role (PRD §4.1)
        person: { include: { user: { select: { id: true } } } },
        district: true,
        club: true,
        pnpRankings: { orderBy: { updatedAt: 'desc' }, take: 5 },
        districtHistory: { orderBy: { changedAt: 'desc' } },
      },
    })
    if (!player) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Player not found' } })

    const central = isCentralAdmin(req)
    const districtId = getDistrictScope(req)
    const isPlayerRole = req.auth?.roles.some((r) => r.role === 'PLAYER') ?? false

    // Admins respecting district scope, OR player viewing own record only
    const isAdminInScope = central || player.districtId === districtId
    const isOwnPlayer = isPlayerRole && player.person.user?.id === req.auth?.userId

    if (!isAdminInScope && !isOwnPlayer) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Out of scope' } })
    }

    // PRD §36 — admins in scope see full data; a PLAYER only ever sees their own record.
    res.json(player)
  } catch (err) {
    next(err)
  }
})
