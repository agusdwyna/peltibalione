import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize, getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { prisma } from '../../shared/database/prisma'
import { validate } from '../../shared/middleware/validate'
import { statsOverviewQuerySchema, type StatsOverviewQuery } from './stats.schema'
import { AppError } from '../../shared/errors/app-error'

export const statsRouter = Router()

statsRouter.use(authenticate)

/**
 * GET /api/stats/overview — operational summary for the Athletes command center.
 * CENTRAL_ADMIN may optionally select a district; DISTRICT_ADMIN is locked to its scope.
 */
statsRouter.get(
  '/overview',
  authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }),
  validate(statsOverviewQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const central = isCentralAdmin(req)
      const districtScope = getDistrictScope(req)
      const query = req.query as unknown as StatsOverviewQuery

      if (!central && !districtScope) {
        throw AppError.forbidden('District scope required')
      }
      if (!central && query.districtId && query.districtId !== districtScope) {
        throw AppError.forbidden('District scope is locked to your assigned district')
      }

      const filterDistrict = central ? query.districtId : districtScope
      if (filterDistrict) {
        const district = await prisma.district.findUnique({ where: { id: filterDistrict }, select: { id: true } })
        if (!district) throw AppError.notFound('District not found')
      }

      const districtWhere = filterDistrict ? { districtId: filterDistrict } : {}
      const submissionWhere = filterDistrict ? { form: { districtId: filterDistrict } } : {}

      const [total, verified, pending, activeForms, totalSubmissions, pendingSubmissions, totalClubs] =
        await Promise.all([
          prisma.player.count({ where: districtWhere }),
          prisma.player.count({ where: { ...districtWhere, status: 'VERIFIED' } }),
          prisma.player.count({ where: { ...districtWhere, status: 'PENDING_VERIFICATION' } }),
          prisma.registrationForm.count({ where: { ...districtWhere, status: 'ACTIVE' } }),
          prisma.playerSubmission.count({ where: submissionWhere }),
          prisma.playerSubmission.count({
            where: { ...submissionWhere, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
          }),
          prisma.club.count({ where: filterDistrict ? { districtId: filterDistrict } : {} }),
        ])

      res.json({
        data: {
          athletes: total,
          verified,
          pending,
          activeForms,
          totalSubmissions,
          pendingSubmissions,
          clubs: totalClubs,
          ...(filterDistrict ? { districtId: filterDistrict } : {}),
        },
      })
    } catch (err) {
      next(err)
    }
  },
)
