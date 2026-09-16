import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope } from '../../shared/middleware/authorize'
import { prisma } from '../../shared/database/prisma'
import { createForm, setFormStatus } from './forms.controller'
import { ensureDistrictForm } from './forms.service'

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
formsRouter.get('/', authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }), async (req, res, next) => {
  try {
    const scopedDistrictId = getDistrictScope(req)
    // District Admin is always restricted to token scope. Central Admin may select
    // one workspace, or omit districtId to intentionally view all workspaces.
    const requestedDistrictId = typeof req.query.districtId === 'string' ? req.query.districtId : undefined
    const districtId = scopedDistrictId ?? requestedDistrictId
    // Lazy auto-create: each district gets its own registration form.
    if (districtId) {
      await ensureDistrictForm(districtId, req.auth!.userId)
    }
    const where = districtId ? { districtId } : {}
    const forms = await prisma.registrationForm.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        district: { select: { name: true, code: true } },
        owner: { select: { name: true, email: true } },
        _count: { select: { submissions: true } },
      },
    })

    // Breakdown submission counts per status for the detail modal (PRD §17)
    const ids = forms.map((form) => form.id)
    const grouped = ids.length
      ? await prisma.formSubmission.groupBy({
          by: ['formId', 'status'],
          where: { formId: { in: ids } },
          _count: { _all: true },
        })
      : []
    const statsByForm = new Map<string, Record<string, number>>()
    for (const row of grouped) {
      const entry = statsByForm.get(row.formId) ?? {}
      entry[row.status] = row._count._all
      statsByForm.set(row.formId, entry)
    }

    const data = forms.map((form) => ({
      ...form,
      submissionStats: statsByForm.get(form.id) ?? {},
    }))
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