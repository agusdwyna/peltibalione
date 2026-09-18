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
  deleteOfficial,
  replaceOfficialCertificates,
  replaceOfficialTournaments,
  updateOfficial,
  verifyOfficial,
} from './officials.controller'
import {
  officialCertificateParamsSchema,
  officialDetailQuerySchema,
  officialIdSchema,
  officialListQuerySchema,
} from './officials.schema'

export const officialsRouter = Router()

const fileSelect = {
  select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
} as const

officialsRouter.use(authenticate)

const adminRoles = ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] as const

// GET /api/officials/stats — statistik sederhana; harus di atas `/:id`
officialsRouter.get(
  '/stats',
  authorize({ roles: [...adminRoles] }),
  validate(officialDetailQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const scoped = getDistrictScope(req)
      const requested = typeof req.query.districtId === 'string' ? req.query.districtId : undefined
      if (scoped && requested && requested !== scoped) {
        return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
      }
      const districtId = scoped ?? requested
      const where: Prisma.OfficialWhereInput = districtId ? { districtId } : {}

      const [total, byStatus, byDistrict] = await Promise.all([
        prisma.official.count({ where }),
        prisma.official.groupBy({ by: ['officialStatus'], where, _count: { _all: true } }),
        // Sebaran per distrik hanya bermakna saat melihat seluruh wilayah.
        districtId ? [] : prisma.official.groupBy({ by: ['districtId'], _count: { _all: true } }),
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
          active: byStatus.find((row) => row.officialStatus === 'AKTIF')?._count._all ?? 0,
          inactive: byStatus.find((row) => row.officialStatus === 'TIDAK_AKTIF')?._count._all ?? 0,
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

// GET /api/officials — master wasit, terbatas pada workspace yang dipilih (§12)
officialsRouter.get(
  '/',
  authorize({ roles: [...adminRoles] }),
  validate(officialListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof officialListQuerySchema>
      const scoped = getDistrictScope(req)
      // District admin terkunci token; central admin boleh memilih satu
      // workspace atau sengaja melihat seluruh wilayah.
      if (scoped && query.districtId && query.districtId !== scoped) {
        return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
      }
      const districtId = scoped ?? query.districtId

      const where: Prisma.OfficialWhereInput = {
        ...(districtId ? { districtId } : {}),
        ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
        ...(query.officialStatus ? { officialStatus: query.officialStatus } : {}),
        ...(query.role ? { roles: { has: query.role } } : {}),
        ...(query.level ? { level: query.level } : {}),
        // §13 — pencarian berdasarkan nama atau NIK
        ...(query.q
          ? {
              OR: [
                { fullName: { contains: query.q, mode: 'insensitive' as const } },
                { nik: { contains: query.q } },
                { officialCode: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      }

      const [data, total] = await Promise.all([
        prisma.official.findMany({
          where,
          ...paginationArgs({ page: query.page, pageSize: query.pageSize }),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            officialCode: true,
            fullName: true,
            nik: true,
            gender: true,
            roles: true,
            level: true,
            officiatingSince: true,
            officialStatus: true,
            verificationStatus: true,
            acceptingAssignments: true,
            photoId: true,
            district: { select: { id: true, name: true, code: true } },
            // §5 — jumlah turnamen dihitung sistem, tidak pernah diinput manual.
            _count: { select: { certificates: true, tournaments: true } },
          },
        }),
        prisma.official.count({ where }),
      ])

      res.json(paginatedResponse(data, total, { page: query.page, pageSize: query.pageSize }))
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/officials/:id — §14 profil lengkap termasuk lisensi & riwayat turnamen
officialsRouter.get(
  '/:id',
  authorize({ roles: [...adminRoles] }),
  validate(officialIdSchema, 'params'),
  validate(officialDetailQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const official = await prisma.official.findUnique({
        where: { id: String(req.params.id) },
        include: {
          district: { select: { id: true, name: true, code: true } },
          photo: fileSelect,
          certificates: { orderBy: { sortOrder: 'asc' }, include: { file: fileSelect } },
          tournaments: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { tournaments: true } },
        },
      })
      if (!official) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Wasit tidak ditemukan' } })
      const scoped = getDistrictScope(req)
      if (scoped && official.districtId !== scoped) {
        return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
      }

      // Nama verifikator disimpan sebagai userId — diresolusi untuk tampilan (§10).
      const verifier = official.verifiedBy
        ? await prisma.user.findUnique({ where: { id: official.verifiedBy }, select: { name: true, email: true } })
        : null

      res.json({ data: { ...official, verifier } })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/officials/:id — sunting data master
officialsRouter.patch('/:id', authorize({ roles: [...adminRoles] }), validate(officialIdSchema, 'params'), updateOfficial)

// PATCH /api/officials/:id/verification — §10 status verifikasi + catatan admin
officialsRouter.patch(
  '/:id/verification',
  authorize({ roles: [...adminRoles] }),
  validate(officialIdSchema, 'params'),
  verifyOfficial,
)

// PUT /api/officials/:id/certificates — ganti seluruh daftar lisensi (§6)
officialsRouter.put(
  '/:id/certificates',
  authorize({ roles: [...adminRoles] }),
  validate(officialIdSchema, 'params'),
  replaceOfficialCertificates,
)

// PUT /api/officials/:id/tournaments — ganti seluruh riwayat turnamen (§7)
officialsRouter.put(
  '/:id/tournaments',
  authorize({ roles: [...adminRoles] }),
  validate(officialIdSchema, 'params'),
  replaceOfficialTournaments,
)

// DELETE /api/officials/:id/certificates/:certificateId/file — hapus berkasnya saja
officialsRouter.delete(
  '/:id/certificates/:certificateId/file',
  authorize({ roles: [...adminRoles] }),
  validate(officialCertificateParamsSchema, 'params'),
  deleteCertificateFile,
)

// DELETE /api/officials/:id — hapus master wasit beserta seluruh berkasnya
officialsRouter.delete('/:id', authorize({ roles: [...adminRoles] }), validate(officialIdSchema, 'params'), deleteOfficial)
