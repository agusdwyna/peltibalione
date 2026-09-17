import { Router, type Request } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import type { FacilitySubmissionStatus, Prisma } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { prisma } from '../../shared/database/prisma'
import { paginationArgs, paginatedResponse } from '../../shared/utils/pagination'
import {
  createAdminFacilitySubmission,
  createPublicFacilitySubmission,
  reviewFacilitySubmission,
} from './facilities.controller'
import {
  facilityDetailQuerySchema,
  facilityIdSchema,
  facilitySubmissionListQuerySchema,
} from './facilities.schema'

export const facilitySubmissionsRouter = Router()

const adminRoles = ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] as const

// PRD §47 — batasi pengajuan publik untuk menekan penyalahgunaan
const publicSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Terlalu banyak pengajuan. Coba lagi nanti.' } },
})

// Publik: kirim pendataan lapangan lewat token form aktif (tanpa auth)
facilitySubmissionsRouter.post('/public', publicSubmissionLimiter, createPublicFacilitySubmission)

facilitySubmissionsRouter.use(authenticate)

// POST /api/facility-submissions/direct — admin input langsung di workspace-nya
facilitySubmissionsRouter.post('/direct', authorize({ roles: [...adminRoles] }), createAdminFacilitySubmission)

/** Antrean review hanya bermakna dalam satu workspace distrik. */
function resolveReadScope(
  req: Request,
  requestedDistrictId?: string,
): { districtId: string } | { error: 'OUT_OF_DISTRICT_SCOPE' | 'DISTRICT_CONTEXT_REQUIRED' } {
  const scoped = getDistrictScope(req)
  if (scoped) {
    if (requestedDistrictId && requestedDistrictId !== scoped) return { error: 'OUT_OF_DISTRICT_SCOPE' }
    return { districtId: scoped }
  }
  if (isCentralAdmin(req) && !requestedDistrictId) return { error: 'DISTRICT_CONTEXT_REQUIRED' }
  if (!requestedDistrictId) return { error: 'DISTRICT_CONTEXT_REQUIRED' }
  return { districtId: requestedDistrictId }
}

// GET /api/facility-submissions — antrean pengajuan yang menunggu review
facilitySubmissionsRouter.get(
  '/',
  authorize({ roles: [...adminRoles] }),
  validate(facilitySubmissionListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof facilitySubmissionListQuerySchema>
      const scope = resolveReadScope(req, query.districtId)
      if ('error' in scope) {
        const status = scope.error === 'OUT_OF_DISTRICT_SCOPE' ? 403 : 400
        const message = scope.error === 'OUT_OF_DISTRICT_SCOPE'
          ? 'Out of district scope'
          : 'Pilih workspace distrik terlebih dahulu'
        return res.status(status).json({ error: { code: scope.error, message } })
      }

      const where: Prisma.FacilitySubmissionWhereInput = {
        form: { districtId: scope.districtId },
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] as FacilitySubmissionStatus[] },
        ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
      }

      const [data, total] = await Promise.all([
        prisma.facilitySubmission.findMany({
          where,
          ...paginationArgs({ page: query.page, pageSize: query.pageSize }),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            name: true,
            address: true,
            courtCount: true,
            courtType: true,
            surface: true,
            operationalStatus: true,
            coverPhotoId: true,
            createdAt: true,
            _count: { select: { photos: true } },
            form: { select: { title: true, district: { select: { name: true } } } },
          },
        }),
        prisma.facilitySubmission.count({ where }),
      ])

      res.json(paginatedResponse(data, total, { page: query.page, pageSize: query.pageSize }))
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/facility-submissions/:id — detail untuk halaman review
facilitySubmissionsRouter.get(
  '/:id',
  authorize({ roles: [...adminRoles] }),
  validate(facilityIdSchema, 'params'),
  validate(facilityDetailQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const requestedDistrictId = typeof req.query.districtId === 'string' ? req.query.districtId : undefined
      const scope = resolveReadScope(req, requestedDistrictId)
      if ('error' in scope) {
        const status = scope.error === 'OUT_OF_DISTRICT_SCOPE' ? 403 : 400
        const message = scope.error === 'OUT_OF_DISTRICT_SCOPE'
          ? 'Out of district scope'
          : 'Pilih workspace distrik terlebih dahulu'
        return res.status(status).json({ error: { code: scope.error, message } })
      }

      const submission = await prisma.facilitySubmission.findUnique({
        where: { id: String(req.params.id) },
        include: {
          form: { include: { district: { select: { id: true, name: true, code: true } } } },
          photos: {
            select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          },
          amenities: {
            orderBy: { sortOrder: 'asc' },
            include: {
              photos: {
                select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      })
      if (!submission) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pengajuan tidak ditemukan' } })
      if (submission.form.districtId !== scope.districtId) {
        return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
      }

      res.json({ data: submission })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/facility-submissions/:id/review — setujui (jadi master) atau tolak
facilitySubmissionsRouter.post(
  '/:id/review',
  authorize({ roles: [...adminRoles] }),
  validate(facilityIdSchema, 'params'),
  reviewFacilitySubmission,
)
