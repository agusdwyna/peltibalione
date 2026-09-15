import { Request, Response, NextFunction } from 'express'
import { verificationDecisionSchema } from './verification.schema'
import * as verificationService from './verification.service'
import { getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const input = verificationDecisionSchema.parse(req.body ?? {})
    const result = await verificationService.decide(String(req.params.id), 'APPROVED', req.auth!.userId, input, {
      central: isCentralAdmin(req),
      districtId: getDistrictScope(req),
    })
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const input = verificationDecisionSchema.parse(req.body ?? {})
    const result = await verificationService.decide(String(req.params.id), 'REJECTED', req.auth!.userId, input, {
      central: isCentralAdmin(req),
      districtId: getDistrictScope(req),
    })
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}