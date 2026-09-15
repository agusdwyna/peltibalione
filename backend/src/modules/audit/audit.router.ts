import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { AppError } from '../../shared/errors/app-error'
import { prisma } from '../../shared/database/prisma'
import { validate } from '../../shared/middleware/validate'
import { paginationArgs, paginatedResponse } from '../../shared/utils/pagination'
import { auditQuerySchema, type AuditQuery } from './audit.schema'

export const auditRouter = Router()

auditRouter.use(authenticate)
auditRouter.use(authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }))

auditRouter.get('/', validate(auditQuerySchema, 'query'), async (req, res, next) => {
  try {
    const query = req.query as unknown as AuditQuery
    const central = isCentralAdmin(req)
    const districtScope = getDistrictScope(req)
    if (!central && !districtScope) throw AppError.forbidden('District scope required')
    // Central admins may filter by district; district admins are always locked to own district.
    const districtId = central ? query.districtId : districtScope
    const where = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(districtId ? { districtId } : {}),
      ...(query.from || query.to
        ? {
            timestamp: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        ...paginationArgs(query),
        orderBy: { timestamp: 'desc' },
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ])

    res.json(paginatedResponse(data, total, query))
  } catch (err) {
    next(err)
  }
})
