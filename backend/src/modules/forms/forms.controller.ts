import { Request, Response, NextFunction } from 'express'
import { createFormSchema } from './forms.schema'
import * as formsService from './forms.service'
import { getDistrictScope } from '../../shared/middleware/authorize'
import { AppError } from '../../shared/errors/app-error'
import { prisma } from '../../shared/database/prisma'

export async function createForm(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createFormSchema.parse(req.body)
    // District Admin: scope from token. Central Admin: explicit districtId in body.
    const districtId = getDistrictScope(req) ?? input.districtId
    if (!districtId) throw AppError.forbidden('District scope required')
    const form = await formsService.createForm(input, req.auth!.userId, districtId)
    res.status(201).json({ data: form })
  } catch (err) {
    next(err)
  }
}

export async function setFormStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const target = req.body.status === 'ACTIVE' ? 'ACTIVE' : 'CLOSED'
    // District Admin: scope from token. Central Admin: resolve from form.
    let districtId = getDistrictScope(req)
    if (!districtId) {
      const form = await prisma.registrationForm.findUnique({
        where: { id: String(req.params.id) },
        select: { districtId: true },
      })
      if (!form) throw AppError.notFound('Form not found')
      districtId = form.districtId
    }
    const updated = await formsService.setFormStatus(String(req.params.id), target, req.auth!.userId, districtId)
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}