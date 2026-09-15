import { Request, Response, NextFunction } from 'express'
import { adminSubmissionSchema, publicSubmissionSchema, reviewSubmissionSchema } from './submissions.schema'
import * as submissionsService from './submissions.service'
import { getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { AppError } from '../../shared/errors/app-error'
import { prisma } from '../../shared/database/prisma'

export async function createSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const input = publicSubmissionSchema.parse(req.body)
    const result = await submissionsService.createSubmission(input)
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function createAdminSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = adminSubmissionSchema.parse(req.body)
    const { formToken, districtId: bodyDistrictId, ...input } = parsed
    // District Admin: scope from token. Central Admin: explicit districtId in body.
    const districtId = getDistrictScope(req) ?? bodyDistrictId
    if (!districtId) throw AppError.forbidden('District scope or districtId required')
    const result = await submissionsService.createSubmissionInDistrict(
      input,
      districtId,
      req.auth!.userId,
    )
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function reviewSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = reviewSubmissionSchema.parse(req.body)
    const { districtId: requestedDistrictId, ...input } = parsed
    const districtId = getDistrictScope(req) ?? requestedDistrictId
    if (isCentralAdmin(req) && !requestedDistrictId) throw AppError.badRequest('DISTRICT_CONTEXT_REQUIRED', 'Pilih workspace distrik terlebih dahulu')
    if (!districtId) throw AppError.forbidden('District scope required')
    const result = await submissionsService.reviewSubmission(
      String(req.params.id),
      input,
      req.auth!.userId,
      districtId,
    )
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}