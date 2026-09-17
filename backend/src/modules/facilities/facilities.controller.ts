import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../shared/errors/app-error'
import { getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { prisma } from '../../shared/database/prisma'
import {
  adminFacilitySubmissionSchema,
  attachAmenityPhotosSchema,
  publicFacilitySubmissionSchema,
  replaceFacilityAmenitiesSchema,
  reviewFacilitySubmissionSchema,
  updateFacilitySchema,
  verifyFacilitySchema,
} from './facilities.schema'
import * as facilitiesService from './facilities.service'

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

export async function createPublicFacilitySubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const input = publicFacilitySubmissionSchema.parse(req.body)
    const result = await facilitiesService.createFacilitySubmission(input)
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function createAdminFacilitySubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { districtId: bodyDistrictId, ...input } = adminFacilitySubmissionSchema.parse(req.body)
    const districtId = resolveWriteScope(req, bodyDistrictId)
    const result = await facilitiesService.createFacilitySubmissionInDistrict(
      input,
      districtId,
      req.auth!.userId,
    )
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function reviewFacilitySubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { districtId: requestedDistrictId, ...input } = reviewFacilitySubmissionSchema.parse(req.body)
    const districtId = resolveWriteScope(req, requestedDistrictId)
    const result = await facilitiesService.reviewFacilitySubmission(
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

export async function updateFacility(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateFacilitySchema.parse(req.body)
    // Central Admin boleh mengedit lintas workspace; district admin dikunci token.
    const districtId = getDistrictScope(req)
    const updated = await facilitiesService.updateFacility(
      String(req.params.id),
      input,
      req.auth!.userId,
      districtId,
    )
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

export async function verifyFacility(req: Request, res: Response, next: NextFunction) {
  try {
    const input = verifyFacilitySchema.parse(req.body)
    const districtId = getDistrictScope(req)
    const updated = await facilitiesService.verifyFacility(
      String(req.params.id),
      input,
      req.auth!.userId,
      districtId,
    )
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteFacility(req: Request, res: Response, next: NextFunction) {
  try {
    const districtId = getDistrictScope(req)
    const result = await facilitiesService.deleteFacility(
      String(req.params.id),
      req.auth!.userId,
      districtId,
    )
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function replaceFacilityAmenities(req: Request, res: Response, next: NextFunction) {
  try {
    const input = replaceFacilityAmenitiesSchema.parse(req.body)
    const districtId = getDistrictScope(req)
    const amenities = await facilitiesService.replaceFacilityAmenities(
      String(req.params.id),
      input,
      req.auth!.userId,
      districtId,
    )
    res.json({ data: amenities })
  } catch (err) {
    next(err)
  }
}

export async function attachAmenityPhotos(req: Request, res: Response, next: NextFunction) {
  try {
    const { photoIds } = attachAmenityPhotosSchema.parse(req.body)
    const districtId = getDistrictScope(req)
    const result = await facilitiesService.attachAmenityPhotos(
      String(req.params.id),
      String(req.params.amenityId),
      photoIds,
      req.auth!.userId,
      districtId,
    )
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function deleteAmenityPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const districtId = getDistrictScope(req)
    const result = await facilitiesService.deleteAmenityPhoto(
      String(req.params.id),
      String(req.params.amenityId),
      String(req.params.photoId),
      req.auth!.userId,
      districtId,
    )
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function deleteFacilityPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const districtId = getDistrictScope(req)
    const result = await facilitiesService.deleteFacilityPhoto(
      String(req.params.id),
      String(req.params.photoId),
      req.auth!.userId,
      districtId,
    )
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

/** Foto tambahan untuk master lapangan yang sudah ada. */
export async function attachFacilityPhotos(req: Request, res: Response, next: NextFunction) {
  try {
    const facilityId = String(req.params.id)
    const photoIds = Array.isArray(req.body?.photoIds) ? (req.body.photoIds as unknown[]) : []
    const ids = photoIds.filter((id): id is string => typeof id === 'string')
    if (!ids.length) throw AppError.badRequest('NO_PHOTOS', 'Tidak ada foto untuk dilampirkan')

    const facility = await prisma.facility.findUnique({ where: { id: facilityId } })
    if (!facility) throw AppError.notFound('Lapangan tidak ditemukan')
    const scoped = getDistrictScope(req)
    if (scoped && facility.districtId !== scoped) throw AppError.forbidden('Out of district scope')

    const attached = await prisma.file.updateMany({
      where: { id: { in: ids }, facilityId: null, facilitySubmissionId: null },
      data: { entityType: 'FACILITY_PHOTO', entityId: facilityId, facilityId },
    })
    res.json({ data: { attached: attached.count } })
  } catch (err) {
    next(err)
  }
}
