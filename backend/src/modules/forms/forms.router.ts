import { Router } from 'express'
import type { FormType } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { prisma } from '../../shared/database/prisma'
import { createForm, setFormStatus } from './forms.controller'
import { ensureDistrictForm } from './forms.service'
import { listFormsQuerySchema } from './forms.schema'

export const formsRouter = Router()

// Public endpoints — no auth for viewing active forms
formsRouter.get('/public/:token', async (req, res, next) => {
  try {
    const form = await prisma.registrationForm.findFirst({
      where: { publicToken: req.params.token, status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        district: { select: { name: true } },
      },
    })
    if (!form) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Form not found or inactive' } })
    res.json(form)
  } catch (err) {
    next(err)
  }
})

// GET /api/forms/age-groups/public — master kelompok umur untuk dropdown form publik
formsRouter.get('/age-groups/public', async (_req, res, next) => {
  try {
    const groups = await prisma.ageGroup.findMany({
      where: { code: { in: ['KU 8', 'KU 10 PI', 'KU 10 PA', 'KU 12 PI', 'KU 12 PA', 'KU 14 PA', 'KU 14 PI', 'KU 16 PI', 'KU 16 PA', 'KU 18 PI', 'KU 18 PA'] } },
      orderBy: { sortOrder: 'asc' },
    })
    res.json({ data: groups })
  } catch (err) {
    next(err)
  }
})

// GET /api/forms/district/:id/public — active forms for one district (public portal)
formsRouter.get('/district/:id/public', async (req, res, next) => {
  try {
    const forms = await prisma.registrationForm.findMany({
      where: { districtId: req.params.id, status: 'ACTIVE' },
      select: { id: true, title: true, publicToken: true, type: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ data: forms })
  } catch (err) {
    next(err)
  }
})

// All other form routes require auth
formsRouter.use(authenticate)

// GET /api/forms — list forms (district-scoped) with per-status submission stats
formsRouter.get('/', authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }), validate(listFormsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { districtId: requestedDistrictId, type } = req.query as unknown as {
      districtId?: string
      type?: FormType
    }
    const scopedDistrictId = getDistrictScope(req)
    // District Admin is always restricted to token scope. Central Admin may select
    // one workspace, or omit districtId to intentionally view all workspaces.
    const districtId = scopedDistrictId ?? requestedDistrictId
    // Lazy auto-create: each district gets its own form per type.
    if (districtId) {
      await ensureDistrictForm(districtId, req.auth!.userId, type ?? 'PLAYER_REGISTRATION')
    }
    const where = { ...(districtId ? { districtId } : {}), ...(type ? { type } : {}) }
    const forms = await prisma.registrationForm.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        district: { select: { name: true, code: true } },
        owner: { select: { name: true, email: true } },
        _count: {
          select: {
            submissions: true,
            facilitySubmissions: true,
            coachSubmissions: true,
            officialSubmissions: true,
          },
        },
      },
    })

    // Breakdown submission counts per status for the detail modal (PRD §17).
    // Player, facility, coach, and official submissions live in separate tables,
    // so each form is counted against the table that matches its own type.
    const playerFormIds = forms.filter((form) => form.type === 'PLAYER_REGISTRATION').map((form) => form.id)
    const facilityFormIds = forms.filter((form) => form.type === 'FACILITY_REGISTRATION').map((form) => form.id)
    const coachFormIds = forms.filter((form) => form.type === 'COACH_REGISTRATION').map((form) => form.id)
    const officialFormIds = forms.filter((form) => form.type === 'OFFICIAL_REGISTRATION').map((form) => form.id)
    const [playerGrouped, facilityGrouped, coachGrouped, officialGrouped] = await Promise.all([
      playerFormIds.length
        ? prisma.playerSubmission.groupBy({
            by: ['formId', 'status'],
            where: { formId: { in: playerFormIds } },
            _count: { _all: true },
          })
        : [],
      facilityFormIds.length
        ? prisma.facilitySubmission.groupBy({
            by: ['formId', 'status'],
            where: { formId: { in: facilityFormIds } },
            _count: { _all: true },
          })
        : [],
      coachFormIds.length
        ? prisma.coachSubmission.groupBy({
            by: ['formId', 'status'],
            where: { formId: { in: coachFormIds } },
            _count: { _all: true },
          })
        : [],
      officialFormIds.length
        ? prisma.officialSubmission.groupBy({
            by: ['formId', 'status'],
            where: { formId: { in: officialFormIds } },
            _count: { _all: true },
          })
        : [],
    ])
    const statsByForm = new Map<string, Record<string, number>>()
    for (const row of [...playerGrouped, ...facilityGrouped, ...coachGrouped, ...officialGrouped]) {
      const entry = statsByForm.get(row.formId) ?? {}
      entry[row.status] = row._count._all
      statsByForm.set(row.formId, entry)
    }

    const data = forms.map((form) => {
      const { _count, ...rest } = form
      return {
        ...rest,
        _count: {
          submissions:
            form.type === 'FACILITY_REGISTRATION' ? _count.facilitySubmissions
            : form.type === 'COACH_REGISTRATION' ? _count.coachSubmissions
            : form.type === 'OFFICIAL_REGISTRATION' ? _count.officialSubmissions
            : _count.submissions,
        },
        submissionStats: statsByForm.get(form.id) ?? {},
      }
    })
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// POST /api/forms — create form (district admin or central admin)
formsRouter.post('/', authorize({ roles: ['DISTRICT_ADMIN', 'CENTRAL_ADMIN'] }), createForm)

// PATCH /api/forms/:id/status — open/close form
formsRouter.patch(
  '/:id/status',
  authorize({ roles: ['DISTRICT_ADMIN', 'CENTRAL_ADMIN'] }),
  setFormStatus,
)