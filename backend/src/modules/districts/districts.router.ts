import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { prisma } from '../../shared/database/prisma'

export const districtsRouter = Router()

const PUBLIC_PLAYER_STATUSES = ['VERIFIED', 'ACTIVE', 'INACTIVE'] as const
// Halaman publik hanya menampilkan data resmi — lapangan yang masih MENUNGGU
// atau DITOLAK belum terverifikasi, jadi tidak ikut dihitung.
const PUBLIC_FACILITY_STATUS = 'TERVERIFIKASI' as const
// Idem untuk pelatih & wasit — hanya yang sudah diverifikasi admin yang
// dihitung publik.
const PUBLIC_COACH_STATUS = 'TERVERIFIKASI' as const
const PUBLIC_OFFICIAL_STATUS = 'TERVERIFIKASI' as const

// GET /api/districts — public landing data with official player & facility counts only
 districtsRouter.get('/', async (_req, res, next) => {
  try {
    const [districts, playerCounts, facilityCounts, coachCounts, officialCounts] = await Promise.all([
      prisma.district.findMany({ orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } }),
      prisma.player.groupBy({ by: ['districtId'], where: { status: { in: [...PUBLIC_PLAYER_STATUSES] } }, _count: { _all: true } }),
      prisma.facility.groupBy({ by: ['districtId'], where: { verificationStatus: PUBLIC_FACILITY_STATUS }, _count: { _all: true } }),
      prisma.coach.groupBy({ by: ['districtId'], where: { verificationStatus: PUBLIC_COACH_STATUS }, _count: { _all: true } }),
      prisma.official.groupBy({ by: ['districtId'], where: { verificationStatus: PUBLIC_OFFICIAL_STATUS }, _count: { _all: true } }),
    ])
    const playersByDistrict = new Map(playerCounts.map((item) => [item.districtId, item._count._all]))
    const facilitiesByDistrict = new Map(facilityCounts.map((item) => [item.districtId, item._count._all]))
    const coachesByDistrict = new Map(coachCounts.map((item) => [item.districtId, item._count._all]))
    const officialsByDistrict = new Map(officialCounts.map((item) => [item.districtId, item._count._all]))
    res.json({
      data: districts.map((district) => ({
        ...district,
        _count: {
          players: playersByDistrict.get(district.id) ?? 0,
          facilities: facilitiesByDistrict.get(district.id) ?? 0,
          coaches: coachesByDistrict.get(district.id) ?? 0,
          referees: officialsByDistrict.get(district.id) ?? 0,
        },
      })),
    })
  } catch (err) { next(err) }
})

// GET /api/districts/public-summary — official totals for public landing page
 districtsRouter.get('/public-summary', async (_req, res, next) => {
  try {
    const [athletes, facilities, coaches, referees] = await Promise.all([
      prisma.player.count({ where: { status: { in: [...PUBLIC_PLAYER_STATUSES] } } }),
      prisma.facility.count({ where: { verificationStatus: PUBLIC_FACILITY_STATUS } }),
      prisma.coach.count({ where: { verificationStatus: PUBLIC_COACH_STATUS } }),
      prisma.official.count({ where: { verificationStatus: PUBLIC_OFFICIAL_STATUS } }),
    ])
    res.json({ data: { athletes, coaches, facilities, referees } })
  } catch (err) { next(err) }
})

// GET /api/districts/:id/overview — safe public district overview
 districtsRouter.get('/:id/overview', async (req, res, next) => {
  try {
    const district = await prisma.district.findUnique({ where: { id: req.params.id }, select: { id: true, code: true, name: true } })
    if (!district) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'District not found' } })
    const players = await prisma.player.findMany({ where: { districtId: district.id, status: { in: [...PUBLIC_PLAYER_STATUSES] } }, orderBy: { playerCode: 'asc' }, take: 100, select: { playerCode: true, fullName: true } })
    res.json({ data: { district: { ...district, officialPlayerCount: players.length }, players: players.map((player) => ({ playerCode: player.playerCode, fullName: player.fullName })) } })
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
