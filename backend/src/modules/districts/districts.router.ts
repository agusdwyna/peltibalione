import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { prisma } from '../../shared/database/prisma'
import {
  PUBLIC_COACH_STATUS,
  PUBLIC_FACILITY_STATUS,
  PUBLIC_OFFICIAL_STATUS,
  PUBLIC_PLAYER_STATUSES,
} from '../../shared/utils/public-visibility'

export const districtsRouter = Router()

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

// GET /api/districts/:id/overview — safe public district overview.
// Hanya field yang boleh tampil publik: tanpa NIK, alamat, kontak, atau berkas.
 districtsRouter.get('/:id/overview', async (req, res, next) => {
  try {
    const district = await prisma.district.findUnique({ where: { id: req.params.id }, select: { id: true, code: true, name: true } })
    if (!district) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'District not found' } })

    const [players, facilities, coaches, officials, forms] = await Promise.all([
      prisma.player.findMany({
        where: { districtId: district.id, status: { in: [...PUBLIC_PLAYER_STATUSES] } },
        orderBy: { playerCode: 'asc' },
        take: 100,
        select: {
          playerCode: true, fullName: true, gender: true, ageGroup: true, status: true,
          club: { select: { name: true } },
          pnpRankings: { orderBy: { updatedAt: 'desc' }, take: 1, select: { rank: true, period: true } },
        },
      }),
      prisma.facility.findMany({
        where: { districtId: district.id, verificationStatus: PUBLIC_FACILITY_STATUS },
        orderBy: { name: 'asc' },
        take: 100,
        select: { facilityCode: true, name: true, address: true, courtCount: true, courtType: true, grade: true, openTime: true, closeTime: true, coverPhotoId: true },
      }),
      prisma.coach.findMany({
        where: { districtId: district.id, verificationStatus: PUBLIC_COACH_STATUS },
        orderBy: { fullName: 'asc' },
        take: 100,
        select: { coachCode: true, fullName: true, clubName: true, coachingSince: true, specializations: true, photoId: true },
      }),
      prisma.official.findMany({
        where: { districtId: district.id, verificationStatus: PUBLIC_OFFICIAL_STATUS },
        orderBy: { fullName: 'asc' },
        take: 100,
        select: { officialCode: true, fullName: true, level: true, officiatingSince: true, roles: true, photoId: true },
      }),
      // Form aktif dipakai tombol "Daftar" di halaman detail publik.
      prisma.registrationForm.findMany({
        where: { districtId: district.id, status: 'ACTIVE' },
        select: { publicToken: true, type: true, title: true },
      }),
    ])

    const formByType = new Map(forms.map((form) => [form.type, form.publicToken]))

    res.json({
      data: {
        district: { ...district, officialPlayerCount: players.length },
        players: players.map((player) => ({
          playerCode: player.playerCode,
          fullName: player.fullName,
          gender: player.gender,
          ageGroup: player.ageGroup,
          status: player.status,
          clubName: player.club?.name ?? null,
          pnpRank: player.pnpRankings[0]?.rank ?? null,
          pnpPeriod: player.pnpRankings[0]?.period ?? null,
        })),
        facilities: facilities.map((facility) => ({
          facilityCode: facility.facilityCode,
          name: facility.name,
          address: facility.address,
          courtCount: facility.courtCount,
          courtType: facility.courtType,
          grade: facility.grade,
          openTime: facility.openTime,
          closeTime: facility.closeTime,
          // Foto lapangan memang publik (lihat files.access.ts). Foto pemain
          // sengaja TIDAK dikirim — pemain KU 8–18 adalah anak-anak.
          coverPhotoId: facility.coverPhotoId,
        })),
        coaches: coaches.map((coach) => ({
          coachCode: coach.coachCode,
          fullName: coach.fullName,
          clubName: coach.clubName,
          coachingSince: coach.coachingSince,
          specializations: coach.specializations,
          photoId: coach.photoId,
        })),
        officials: officials.map((official) => ({
          officialCode: official.officialCode,
          fullName: official.fullName,
          level: official.level,
          officiatingSince: official.officiatingSince,
          roles: official.roles,
          photoId: official.photoId,
        })),
        registrationForms: {
          player: formByType.get('PLAYER_REGISTRATION') ?? null,
          facility: formByType.get('FACILITY_REGISTRATION') ?? null,
          coach: formByType.get('COACH_REGISTRATION') ?? null,
          official: formByType.get('OFFICIAL_REGISTRATION') ?? null,
        },
      },
    })
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
