import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { prisma } from '../../shared/database/prisma'
import { paginationArgs, paginatedResponse } from '../../shared/utils/pagination'
import {
  attachAmenityPhotos,
  attachFacilityPhotos,
  deleteAmenityPhoto,
  deleteFacility,
  deleteFacilityPhoto,
  replaceFacilityAmenities,
  updateFacility,
  verifyFacility,
} from './facilities.controller'
import {
  facilityAmenityParamsSchema,
  facilityAmenityPhotoParamsSchema,
  facilityDetailQuerySchema,
  facilityIdSchema,
  facilityListQuerySchema,
  facilityPhotoParamsSchema,
} from './facilities.schema'

export const facilitiesRouter = Router()

const photoSelect = {
  select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
} as const

facilitiesRouter.use(authenticate)

const adminRoles = ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] as const

// GET /api/facilities/stats — ringkasan per status operasional; harus di atas `/:id`
facilitiesRouter.get(
  '/stats',
  authorize({ roles: [...adminRoles] }),
  validate(facilityDetailQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const scoped = getDistrictScope(req)
      const requested = typeof req.query.districtId === 'string' ? req.query.districtId : undefined
      if (scoped && requested && requested !== scoped) {
        return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
      }
      const districtId = scoped ?? requested
      const where: Prisma.FacilityWhereInput = districtId ? { districtId } : {}

      const [total, byStatus, courts, byDistrict] = await Promise.all([
        prisma.facility.count({ where }),
        prisma.facility.groupBy({ by: ['operationalStatus'], where, _count: { _all: true } }),
        // Total court menjawab "berapa kapasitas lapangan", bukan sekadar jumlah venue.
        prisma.facility.aggregate({ where, _sum: { courtCount: true } }),
        // Sebaran per distrik hanya bermakna saat melihat seluruh wilayah.
        districtId ? [] : prisma.facility.groupBy({ by: ['districtId'], _count: { _all: true } }),
      ])

      const districts = byDistrict.length
        ? await prisma.district.findMany({
            where: { id: { in: byDistrict.map((row) => row.districtId) } },
            select: { id: true, name: true, code: true },
          })
        : []
      const districtById = new Map(districts.map((district) => [district.id, district]))
      const countOf = (status: string) => byStatus.find((row) => row.operationalStatus === status)?._count._all ?? 0

      res.json({
        data: {
          total,
          active: countOf('AKTIF'),
          renovation: countOf('RENOVASI'),
          inactive: countOf('TIDAK_AKTIF'),
          courts: courts._sum.courtCount ?? 0,
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

// GET /api/facilities — master lapangan, terbatas pada workspace yang dipilih
facilitiesRouter.get(
  '/',
  authorize({ roles: [...adminRoles] }),
  validate(facilityListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof facilityListQuerySchema>
      const scoped = getDistrictScope(req)
      // District admin terkunci token; central admin boleh memilih satu
      // workspace atau sengaja melihat seluruh wilayah.
      if (scoped && query.districtId && query.districtId !== scoped) {
        return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
      }
      const districtId = scoped ?? query.districtId

      const where: Prisma.FacilityWhereInput = {
        ...(districtId ? { districtId } : {}),
        ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
        ...(query.grade ? { grade: query.grade } : {}),
        ...(query.operationalStatus ? { operationalStatus: query.operationalStatus } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' as const } },
                { address: { contains: query.q, mode: 'insensitive' as const } },
                { facilityCode: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      }

      const [data, total] = await Promise.all([
        prisma.facility.findMany({
          where,
          ...paginationArgs({ page: query.page, pageSize: query.pageSize }),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            facilityCode: true,
            name: true,
            address: true,
            courtCount: true,
            courtType: true,
            surface: true,
            operationalStatus: true,
            verificationStatus: true,
            grade: true,
            coverPhotoId: true,
            district: { select: { id: true, name: true, code: true } },
            _count: { select: { photos: true } },
          },
        }),
        prisma.facility.count({ where }),
      ])

      res.json(paginatedResponse(data, total, { page: query.page, pageSize: query.pageSize }))
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/facilities/:id — detail lengkap termasuk foto & jejak verifikasi
facilitiesRouter.get(
  '/:id',
  authorize({ roles: [...adminRoles] }),
  validate(facilityIdSchema, 'params'),
  validate(facilityDetailQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const facility = await prisma.facility.findUnique({
        where: { id: String(req.params.id) },
        include: {
          district: { select: { id: true, name: true, code: true } },
          photos: { ...photoSelect, orderBy: { createdAt: 'asc' } },
          amenities: {
            orderBy: { sortOrder: 'asc' },
            include: { photos: { ...photoSelect, orderBy: { createdAt: 'asc' } } },
          },
        },
      })
      if (!facility) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Lapangan tidak ditemukan' } })
      const scoped = getDistrictScope(req)
      if (scoped && facility.districtId !== scoped) {
        return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
      }

      // Nama verifikator disimpan sebagai userId — diresolusi untuk tampilan (§7).
      const verifier = facility.verifiedBy
        ? await prisma.user.findUnique({ where: { id: facility.verifiedBy }, select: { name: true, email: true } })
        : null

      res.json({ data: { ...facility, verifier } })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/facilities/:id — sunting data master
facilitiesRouter.patch(
  '/:id',
  authorize({ roles: [...adminRoles] }),
  validate(facilityIdSchema, 'params'),
  updateFacility,
)

// PATCH /api/facilities/:id/verification — §7 status verifikasi + grade
facilitiesRouter.patch(
  '/:id/verification',
  authorize({ roles: [...adminRoles] }),
  validate(facilityIdSchema, 'params'),
  verifyFacility,
)

// POST /api/facilities/:id/photos — lampirkan foto tambahan yang sudah diunggah
facilitiesRouter.post(
  '/:id/photos',
  authorize({ roles: [...adminRoles] }),
  validate(facilityIdSchema, 'params'),
  attachFacilityPhotos,
)

// PUT /api/facilities/:id/amenities — ganti seluruh daftar sarana (§4)
facilitiesRouter.put(
  '/:id/amenities',
  authorize({ roles: [...adminRoles] }),
  validate(facilityIdSchema, 'params'),
  replaceFacilityAmenities,
)

// POST /api/facilities/:id/amenities/:amenityId/photos — lampirkan foto sarana
facilitiesRouter.post(
  '/:id/amenities/:amenityId/photos',
  authorize({ roles: [...adminRoles] }),
  validate(facilityAmenityParamsSchema, 'params'),
  attachAmenityPhotos,
)

// DELETE /api/facilities/:id/amenities/:amenityId/photos/:photoId
facilitiesRouter.delete(
  '/:id/amenities/:amenityId/photos/:photoId',
  authorize({ roles: [...adminRoles] }),
  validate(facilityAmenityPhotoParamsSchema, 'params'),
  deleteAmenityPhoto,
)

// DELETE /api/facilities/:id/photos/:photoId — hapus satu foto berikut berkasnya
facilitiesRouter.delete(
  '/:id/photos/:photoId',
  authorize({ roles: [...adminRoles] }),
  validate(facilityPhotoParamsSchema, 'params'),
  deleteFacilityPhoto,
)

// DELETE /api/facilities/:id — hapus master lapangan beserta seluruh fotonya
facilitiesRouter.delete(
  '/:id',
  authorize({ roles: [...adminRoles] }),
  validate(facilityIdSchema, 'params'),
  deleteFacility,
)
