import { Router } from 'express'
import { z } from 'zod'
import type { SubmissionStatus } from '@prisma/client'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { prisma } from '../../shared/database/prisma'
import { paginationArgs, paginatedResponse, paginationSchema } from '../../shared/utils/pagination'
import { createAdminSubmission, createSubmission, reviewSubmission } from './submissions.controller'

export const submissionsRouter = Router()

// PRD §47 — rate limit public registration to deter abuse
const publicSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many submissions. Try again later.' } },
})

// Public: submit to a form (no auth)
submissionsRouter.post('/public', publicSubmissionLimiter, createSubmission)

submissionsRouter.use(authenticate)

// POST /api/submissions/direct — district admin submits on behalf of a player via the district's active form (no formToken needed)
submissionsRouter.post(
  '/direct',
  authorize({ roles: ['DISTRICT_ADMIN', 'CENTRAL_ADMIN'] }),
  createAdminSubmission,
)

// GET /api/submissions — workspace-scoped review queue
submissionsRouter.get('/', async (req, res, next) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query)
    const central = isCentralAdmin(req)
    const districtId = getDistrictScope(req)
    const requestedDistrictId = req.query.districtId ? z.string().uuid().parse(String(req.query.districtId)) : undefined
    const search = typeof req.query.q === 'string' ? String(req.query.q).trim() : ''
    if (central && !requestedDistrictId) throw new Error('DISTRICT_CONTEXT_REQUIRED')
    if (!central && requestedDistrictId && requestedDistrictId !== districtId) {
      return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
    }
    const scopeDistrictId = central ? requestedDistrictId : districtId
    if (!scopeDistrictId) return res.status(403).json({ error: { code: 'DISTRICT_CONTEXT_REQUIRED', message: 'District scope required' } })
    const where = { form: { districtId: scopeDistrictId }, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] as SubmissionStatus[] }, ...(search ? { fullName: { contains: search, mode: 'insensitive' as const } } : {}) }

    const [data, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where,
        ...paginationArgs({ page, pageSize }),
        orderBy: { createdAt: 'desc' },
        include: { form: { select: { title: true, district: { select: { name: true } } } } },
      }),
      prisma.formSubmission.count({ where }),
    ])

    res.json(paginatedResponse(data, total, { page, pageSize }))
  } catch (err) {
    if (err instanceof Error && err.message === 'DISTRICT_CONTEXT_REQUIRED') return res.status(400).json({ error: { code: err.message, message: 'Pilih workspace distrik terlebih dahulu' } })
    next(err)
  }
})

// GET /api/submissions/:id — scoped submission detail for review modal
submissionsRouter.get('/:id', authorize({ roles: ['DISTRICT_ADMIN', 'CENTRAL_ADMIN'] }), async (req, res, next) => {
  try {
    const central = isCentralAdmin(req)
    const jwtDistrictId = getDistrictScope(req)
    const requestedDistrictId = req.query.districtId ? z.string().uuid().parse(String(req.query.districtId)) : undefined
    const districtId = central ? requestedDistrictId : jwtDistrictId
    if (!districtId) return res.status(400).json({ error: { code: 'DISTRICT_CONTEXT_REQUIRED', message: 'Pilih workspace distrik terlebih dahulu' } })
    if (!central && requestedDistrictId && requestedDistrictId !== jwtDistrictId) return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
    const submission = await prisma.formSubmission.findUnique({
      where: { id: String(req.params.id) },
      include: { form: { include: { district: { select: { name: true, code: true } } } }, files: { select: { id: true, entityType: true, originalName: true, mimeType: true, size: true } } },
    })
    if (!submission) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Submission not found' } })
    if (submission.form.districtId !== districtId) return res.status(403).json({ error: { code: 'OUT_OF_DISTRICT_SCOPE', message: 'Out of district scope' } })
    res.json({ data: submission })
  } catch (err) { next(err) }
})

// POST /api/submissions/:id/review — review submission (link to player or reject)
submissionsRouter.post(
  '/:id/review',
  authorize({ roles: ['DISTRICT_ADMIN', 'CENTRAL_ADMIN'] }),
  reviewSubmission,
)