import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { prisma } from '../../shared/database/prisma'
import { paginationArgs, paginatedResponse } from '../../shared/utils/pagination'
import {
  deleteCertificateFile,
  deleteCoach,
  deleteCoachPhoto,
  replaceCoachCertificates,
  updateCoach,
  verifyCoach,
} from './coaches.controller'
import {
  coachCertificateParamsSchema,
  coachDetailQuerySchema,
  coachIdSchema,
  coachListQuerySchema,
} from './coaches.schema'

export const coachesRouter = Router()

const fileSelect = {
  select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
} as const

coachesRouter.use(authenticate)

const adminRoles = ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] as const

// GET /api/coaches/stats — §15 statistik sederhana; harus di atas `/:id`
coachesRouter.get(
  '/stats',
  authorize({ roles: [...adminRoles] }),
  validate(coachDetailQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const scoped = getDistrictScope(req)
      const requested = typeof req.query.districtId === 'string' ? req.query.districtId : undefined
      if (scoped && requested && requested !== scoped) {
        return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
      }
      const districtId = scoped ?? requested
      const where: Prisma.CoachWhereInput = districtId ? { districtId } : {}

      const [total, byStatus, byDistrict] = await Promise.all([
        prisma.coach.count({ where }),
        prisma.coach.groupBy({ by: ['coachStatus'], where, _count: { _all: true } }),
        // Sebaran per distrik hanya bermakna saat melihat seluruh wilayah.
        districtId
          ? []
          : prisma.coach.groupBy({ by: ['districtId'], _count: { _all: true } }),
      ])

      const districts = byDistrict.length
        ? await prisma.district.findMany({
            where: { id: { in: byDistrict.map((row) => row.districtId) } },
            select: { id: true, name: true, code: true },
          })
        : []
      const districtById = new Map(districts.map((district) => [district.id, district]))

      res.json({
        data: {
          total,
          active: byStatus.find((row) => row.coachStatus === 'AKTIF')?._count._all ?? 0,
          inactive: byStatus.find((row) => row.coachStatus === 'TIDAK_AKTIF')?._count._all ?? 0,
          byDistrict: byDistrict
            .map((row) => ({
              districtId: row.districtId,
              name: districtById.get(row.districtId)?.name ?? '—',
              code: districtById.get(row.districtId)?.code ?? '—',
              total: row._count._all,
            }))
            .sort((a, b) => b.total - a.total),
        },
      })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/coaches — master pelatih, terbatas pada workspace yang dipilih (§12)
coachesRouter.get(
  '/',
  authorize({ roles: [...adminRoles] }),
  validate(coachListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof coachListQuerySchema>
      const scoped = getDistrictScope(req)
      // District admin terkunci token; central admin boleh memilih satu
      // workspace atau sengaja melihat seluruh wilayah.
      if (scoped && query.districtId && query.districtId !== scoped) {
        return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
      }
      const districtId = scoped ?? query.districtId

      const where: Prisma.CoachWhereInput = {
        ...(districtId ? { districtId } : {}),
        ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
        ...(query.coachStatus ? { coachStatus: query.coachStatus } : {}),
        ...(query.athleteCategory ? { athleteCategories: { has: query.athleteCategory } } : {}),
        // §13 — pencarian berdasarkan nama, NIK, atau club tempat melatih
        ...(query.q
          ? {
              OR: [
                { fullName: { contains: query.q, mode: 'insensitive' as const } },
                { nik: { contains: query.q } },
                { clubName: { contains: query.q, mode: 'insensitive' as const } },
                { coachCode: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      }

      const [data, total] = await Promise.all([
        prisma.coach.findMany({
          where,
          ...paginationArgs({ page: query.page, pageSize: query.pageSize }),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            coachCode: true,
            fullName: true,
            nik: true,
            gender: true,
            clubName: true,
            coachingSince: true,
            activeAthletes: true,
            athleteCategories: true,
            specializations: true,
            coachStatus: true,
            verificationStatus: true,
            acceptingNewAthletes: true,
            photoId: true,
            district: { select: { id: true, name: true, code: true } },
            _count: { select: { certificates: true } },
          },
        }),
        prisma.coach.count({ where }),
      ])

      res.json(paginatedResponse(data, total, { page: query.page, pageSize: query.pageSize }))
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/coaches/:id — §14 profil lengkap termasuk lisensi & jejak verifikasi
coachesRouter.get(
  '/:id',
  authorize({ roles: [...adminRoles] }),
  validate(coachIdSchema, 'params'),
  validate(coachDetailQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const coach = await prisma.coach.findUnique({
        where: { id: String(req.params.id) },
        include: {
          district: { select: { id: true, name: true, code: true } },
          photo: fileSelect,
          certificates: {
            orderBy: { sortOrder: 'asc' },
            include: { file: fileSelect },
          },
        },
      })
      if (!coach) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pelatih tidak ditemukan' } })
      const scoped = getDistrictScope(req)
      if (scoped && coach.districtId !== scoped) {
        return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
      }

      // Nama verifikator disimpan sebagai userId — diresolusi untuk tampilan (§10).
      const verifier = coach.verifiedBy
        ? await prisma.user.findUnique({ where: { id: coach.verifiedBy }, select: { name: true, email: true } })
        : null

      res.json({ data: { ...coach, verifier } })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/coaches/:id — sunting data master
coachesRouter.patch('/:id', authorize({ roles: [...adminRoles] }), validate(coachIdSchema, 'params'), updateCoach)

// PATCH /api/coaches/:id/verification — §10 status verifikasi + catatan admin
coachesRouter.patch(
  '/:id/verification',
  authorize({ roles: [...adminRoles] }),
  validate(coachIdSchema, 'params'),
  verifyCoach,
)

// PUT /api/coaches/:id/certificates — ganti seluruh daftar lisensi (§7)
coachesRouter.put(
  '/:id/certificates',
  authorize({ roles: [...adminRoles] }),
  validate(coachIdSchema, 'params'),
  replaceCoachCertificates,
)

// DELETE /api/coaches/:id/certificates/:certificateId/file — hapus berkasnya saja
coachesRouter.delete(
  '/:id/certificates/:certificateId/file',
  authorize({ roles: [...adminRoles] }),
  validate(coachCertificateParamsSchema, 'params'),
  deleteCertificateFile,
)

// DELETE /api/coaches/:id/photo — hapus foto profil berikut berkasnya
coachesRouter.delete(
  '/:id/photo',
  authorize({ roles: [...adminRoles] }),
  validate(coachIdSchema, 'params'),
  deleteCoachPhoto,
)

// DELETE /api/coaches/:id — hapus master pelatih beserta seluruh berkasnya
coachesRouter.delete('/:id', authorize({ roles: [...adminRoles] }), validate(coachIdSchema, 'params'), deleteCoach)
