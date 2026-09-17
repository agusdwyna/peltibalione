import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../shared/errors/app-error'
import { getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import {
  adminOfficialSubmissionSchema,
  publicOfficialSubmissionSchema,
  replaceOfficialCertificatesSchema,
  replaceOfficialTournamentsSchema,
  reviewOfficialSubmissionSchema,
  updateOfficialSchema,
  verifyOfficialSchema,
} from './officials.schema'
import * as officialsService from './officials.service'

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

export async function createPublicOfficialSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const input = publicOfficialSubmissionSchema.parse(req.body)
    const result = await officialsService.createOfficialSubmission(input)
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function createAdminOfficialSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { districtId: bodyDistrictId, ...input } = adminOfficialSubmissionSchema.parse(req.body)
    const districtId = resolveWriteScope(req, bodyDistrictId)
    const result = await officialsService.createOfficialSubmissionInDistrict(input, districtId, req.auth!.userId)
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function reviewOfficialSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { districtId: requestedDistrictId, ...input } = reviewOfficialSubmissionSchema.parse(req.body)
    const districtId = resolveWriteScope(req, requestedDistrictId)
    const result = await officialsService.reviewOfficialSubmission(
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

export async function updateOfficial(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateOfficialSchema.parse(req.body)
    // Central Admin boleh mengedit lintas workspace; district admin dikunci token.
    const districtId = getDistrictScope(req)
    const updated = await officialsService.updateOfficial(String(req.params.id), input, req.auth!.userId, districtId)
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

export async function verifyOfficial(req: Request, res: Response, next: NextFunction) {
  try {
    const input = verifyOfficialSchema.parse(req.body)
    const districtId = getDistrictScope(req)
    const updated = await officialsService.verifyOfficial(String(req.params.id), input, req.auth!.userId, districtId)
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteOfficial(req: Request, res: Response, next: NextFunction) {
  try {
    const districtId = getDistrictScope(req)
    const result = await officialsService.deleteOfficial(String(req.params.id), req.auth!.userId, districtId)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function replaceOfficialCertificates(req: Request, res: Response, next: NextFunction) {
  try {
    const input = replaceOfficialCertificatesSchema.parse(req.body)
    const districtId = getDistrictScope(req)
    const certificates = await officialsService.replaceOfficialCertificates(
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

export async function replaceOfficialTournaments(req: Request, res: Response, next: NextFunction) {
  try {
    const input = replaceOfficialTournamentsSchema.parse(req.body)
    const districtId = getDistrictScope(req)
    const tournaments = await officialsService.replaceOfficialTournaments(
      String(req.params.id),
      input,
      req.auth!.userId,
      districtId,
    )
    res.json({ data: tournaments })
  } catch (err) {
    next(err)
  }
}

export async function deleteCertificateFile(req: Request, res: Response, next: NextFunction) {
  try {
    const districtId = getDistrictScope(req)
    const result = await officialsService.deleteCertificateFile(
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
