import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../shared/errors/app-error'
import { getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import {
  adminCoachSubmissionSchema,
  publicCoachSubmissionSchema,
  replaceCoachCertificatesSchema,
  reviewCoachSubmissionSchema,
  updateCoachSchema,
  verifyCoachSchema,
} from './coaches.schema'
import * as coachesService from './coaches.service'

/**
 * District Admin selalu terkunci pada scope token-nya. Central Admin wajib
 * menyebutkan workspace yang sedang dipilih.
 */
function resolveWriteScope(req: Request, requestedDistrictId?: string): string {
  const scoped = getDistrictScope(req)
  if (scoped) {
    if (requestedDistrictId && requestedDistrictId !== scoped) {
      throw AppError.forbidden('Out of district scope')
    }
    return scoped
  }
  if (isCentralAdmin(req)) {
    if (!requestedDistrictId) {
      throw AppError.badRequest('DISTRICT_CONTEXT_REQUIRED', 'Pilih workspace distrik terlebih dahulu')
    }
    return requestedDistrictId
  }
  throw AppError.forbidden('District scope required')
}

export async function createPublicCoachSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const input = publicCoachSubmissionSchema.parse(req.body)
    const result = await coachesService.createCoachSubmission(input)
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function createAdminCoachSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { districtId: bodyDistrictId, ...input } = adminCoachSubmissionSchema.parse(req.body)
    const districtId = resolveWriteScope(req, bodyDistrictId)
    const result = await coachesService.createCoachSubmissionInDistrict(input, districtId, req.auth!.userId)
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function reviewCoachSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { districtId: requestedDistrictId, ...input } = reviewCoachSubmissionSchema.parse(req.body)
    const districtId = resolveWriteScope(req, requestedDistrictId)
    const result = await coachesService.reviewCoachSubmission(
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

export async function updateCoach(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateCoachSchema.parse(req.body)
    // Central Admin boleh mengedit lintas workspace; district admin dikunci token.
    const districtId = getDistrictScope(req)
    const updated = await coachesService.updateCoach(String(req.params.id), input, req.auth!.userId, districtId)
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

export async function verifyCoach(req: Request, res: Response, next: NextFunction) {
  try {
    const input = verifyCoachSchema.parse(req.body)
    const districtId = getDistrictScope(req)
    const updated = await coachesService.verifyCoach(String(req.params.id), input, req.auth!.userId, districtId)
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteCoach(req: Request, res: Response, next: NextFunction) {
  try {
    const districtId = getDistrictScope(req)
    const result = await coachesService.deleteCoach(String(req.params.id), req.auth!.userId, districtId)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function replaceCoachCertificates(req: Request, res: Response, next: NextFunction) {
  try {
    const input = replaceCoachCertificatesSchema.parse(req.body)
    const districtId = getDistrictScope(req)
    const certificates = await coachesService.replaceCoachCertificates(
      String(req.params.id),
      input,
      req.auth!.userId,
      districtId,
    )
    res.json({ data: certificates })
  } catch (err) {
    next(err)
  }
}

export async function deleteCertificateFile(req: Request, res: Response, next: NextFunction) {
  try {
    const districtId = getDistrictScope(req)
    const result = await coachesService.deleteCertificateFile(
      String(req.params.id),
      String(req.params.certificateId),
      req.auth!.userId,
      districtId,
    )
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function deleteCoachPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const districtId = getDistrictScope(req)
    const result = await coachesService.deleteCoachPhoto(String(req.params.id), req.auth!.userId, districtId)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}
