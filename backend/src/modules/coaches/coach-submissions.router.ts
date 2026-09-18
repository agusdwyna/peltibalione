import { Router, type Request } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import type { CoachSubmissionStatus, Prisma } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { prisma } from '../../shared/database/prisma'
import { paginationArgs, paginatedResponse } from '../../shared/utils/pagination'
import {
  createAdminCoachSubmission,
  createPublicCoachSubmission,
  reviewCoachSubmission,
} from './coaches.controller'
import { coachDetailQuerySchema, coachIdSchema, coachSubmissionListQuerySchema } from './coaches.schema'

export const coachSubmissionsRouter = Router()

const adminRoles = ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] as const

const fileSelect = {
  select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
} as const

// PRD §47 — batasi pengajuan publik untuk menekan penyalahgunaan
const publicSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Terlalu banyak pengajuan. Coba lagi nanti.' } },
})

// Publik: kirim pendataan pelatih lewat token form aktif (tanpa auth)
coachSubmissionsRouter.post('/public', publicSubmissionLimiter, createPublicCoachSubmission)

coachSubmissionsRouter.use(authenticate)

// POST /api/coach-submissions/direct — admin input langsung di workspace-nya
coachSubmissionsRouter.post('/direct', authorize({ roles: [...adminRoles] }), createAdminCoachSubmission)

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

function scopeError(error: 'OUT_OF_DISTRICT_SCOPE' | 'DISTRICT_CONTEXT_REQUIRED') {
  return error === 'OUT_OF_DISTRICT_SCOPE'
    ? { status: 403, code: error, message: 'Out of district scope' }
    : { status: 400, code: error, message: 'Pilih workspace distrik terlebih dahulu' }
}

// GET /api/coach-submissions — antrean pengajuan yang menunggu review
coachSubmissionsRouter.get(
  '/',
  authorize({ roles: [...adminRoles] }),
  validate(coachSubmissionListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof coachSubmissionListQuerySchema>
      const scope = resolveReadScope(req, query.districtId)
      if ('error' in scope) {
        const { status, code, message } = scopeError(scope.error)
        return res.status(status).json({ error: { code, message } })
      }

      const where: Prisma.CoachSubmissionWhereInput = {
        form: { districtId: scope.districtId },
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] as CoachSubmissionStatus[] },
        ...(query.q
          ? {
              OR: [
                { fullName: { contains: query.q, mode: 'insensitive' as const } },
                { nik: { contains: query.q } },
                { clubName: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      }

      const [data, total] = await Promise.all([
        prisma.coachSubmission.findMany({
          where,
          ...paginationArgs({ page: query.page, pageSize: query.pageSize }),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            fullName: true,
            nik: true,
            gender: true,
            clubName: true,
            coachingSince: true,
            activeAthletes: true,
            coachStatus: true,
            photoId: true,
            createdAt: true,
            _count: { select: { certificates: true } },
            form: { select: { title: true, district: { select: { name: true } } } },
          },
        }),
        prisma.coachSubmission.count({ where }),
      ])

      res.json(paginatedResponse(data, total, { page: query.page, pageSize: query.pageSize }))
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/coach-submissions/:id — detail untuk halaman review
coachSubmissionsRouter.get(
  '/:id',
  authorize({ roles: [...adminRoles] }),
  validate(coachIdSchema, 'params'),
  validate(coachDetailQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const requestedDistrictId = typeof req.query.districtId === 'string' ? req.query.districtId : undefined
      const scope = resolveReadScope(req, requestedDistrictId)
      if ('error' in scope) {
        const { status, code, message } = scopeError(scope.error)
        return res.status(status).json({ error: { code, message } })
      }

      const submission = await prisma.coachSubmission.findUnique({
        where: { id: String(req.params.id) },
        include: {
          form: { include: { district: { select: { id: true, name: true, code: true } } } },
          photo: fileSelect,
          certificates: { orderBy: { sortOrder: 'asc' }, include: { file: fileSelect } },
        },
      })
      if (!submission) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pengajuan tidak ditemukan' } })
      if (submission.form.districtId !== scope.districtId) {
        return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
      }

      // §17 — beri tanda bila NIK sudah dipakai master pelatih lain, supaya
      // admin tidak menyetujui data ganda tanpa sadar.
      const duplicate = await prisma.coach.findUnique({
        where: { nik: submission.nik },
        select: { id: true, coachCode: true, fullName: true },
      })

      res.json({ data: { ...submission, duplicateOfCoach: duplicate } })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/coach-submissions/:id/review — setujui (jadi master) atau tolak
coachSubmissionsRouter.post(
  '/:id/review',
  authorize({ roles: [...adminRoles] }),
  validate(coachIdSchema, 'params'),
  reviewCoachSubmission,
)
