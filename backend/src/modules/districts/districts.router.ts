import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { prisma } from '../../shared/database/prisma'

export const districtsRouter = Router()

const PUBLIC_PLAYER_STATUSES = ['VERIFIED', 'ACTIVE', 'INACTIVE'] as const

// GET /api/districts — public landing data with official player counts only
 districtsRouter.get('/', async (_req, res, next) => {
  try {
    const [districts, counts] = await Promise.all([
      prisma.district.findMany({ orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } }),
      prisma.player.groupBy({ by: ['districtId'], where: { status: { in: [...PUBLIC_PLAYER_STATUSES] } }, _count: { _all: true } }),
    ])
    const countByDistrict = new Map(counts.map((item) => [item.districtId, item._count._all]))
    res.json({ data: districts.map((district) => ({ ...district, _count: { players: countByDistrict.get(district.id) ?? 0 } })) })
  } catch (err) { next(err) }
})

// GET /api/districts/public-summary — official totals for public landing page
 districtsRouter.get('/public-summary', async (_req, res, next) => {
  try {
    const athletes = await prisma.player.count({ where: { status: { in: [...PUBLIC_PLAYER_STATUSES] } } })
    res.json({ data: { athletes, coaches: 0, facilities: 0, referees: 0 } })
  } catch (err) { next(err) }
})

// GET /api/districts/:id/overview — safe public district overview
 districtsRouter.get('/:id/overview', async (req, res, next) => {
  try {
    const district = await prisma.district.findUnique({ where: { id: req.params.id }, select: { id: true, code: true, name: true } })
    if (!district) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'District not found' } })
    const players = await prisma.player.findMany({ where: { districtId: district.id, status: { in: [...PUBLIC_PLAYER_STATUSES] } }, orderBy: { playerCode: 'asc' }, take: 100, select: { playerCode: true, person: { select: { fullName: true } } } })
    res.json({ data: { district: { ...district, officialPlayerCount: players.length }, players: players.map((player) => ({ playerCode: player.playerCode, fullName: player.person.fullName })) } })
  } catch (err) { next(err) }
})

// All other district routes require auth
districtsRouter.use(authenticate)

// GET /api/districts/:id — single district
districtsRouter.get('/:id', async (req, res, next) => {
  try {
    const district = await prisma.district.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { players: true, admins: true } } },
    })
    if (!district) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'District not found' } })
    res.json(district)
  } catch (err) {
    next(err)
  }
})
