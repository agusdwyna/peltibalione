import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { prisma } from '../../shared/database/prisma'
import { paginationArgs, paginatedResponse, paginationSchema } from '../../shared/utils/pagination'
import { validate } from '../../shared/middleware/validate'
import { verificationDecisionSchema, verificationIdSchema } from './verification.schema'
import { AppError } from '../../shared/errors/app-error'
import { approve, reject } from './verification.controller'

export const verificationRouter = Router()

verificationRouter.use(authenticate)

// GET /api/verification — list verification requests (scope-aware)
verificationRouter.get('/', authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }), async (req, res, next) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query)
    if (!isCentralAdmin(req) && !getDistrictScope(req)) throw AppError.forbidden('District scope required')
    const central = isCentralAdmin(req)
    const districtId = getDistrictScope(req)
    const where = central
      ? {}
      : { level: 'DISTRICT' as const, districtId: districtId! }

    const [data, total] = await Promise.all([
      prisma.verificationRequest.findMany({
        where,
        ...paginationArgs({ page, pageSize }),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.verificationRequest.count({ where }),
    ])

    res.json(paginatedResponse(data, total, { page, pageSize }))
  } catch (err) {
    next(err)
  }
})

// POST /api/verification/:id/approve — approve verification
verificationRouter.post('/:id/approve', authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }), validate(verificationIdSchema, 'params'), validate(verificationDecisionSchema), approve)

// POST /api/verification/:id/reject — reject verification
verificationRouter.post('/:id/reject', authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }), validate(verificationIdSchema, 'params'), validate(verificationDecisionSchema), reject)