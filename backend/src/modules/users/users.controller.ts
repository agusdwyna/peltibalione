import { Request, Response, NextFunction } from 'express'
import * as usersService from './users.service'
import { paginatedResponse } from '../../shared/utils/pagination'
import { getDistrictScope, isCentralAdmin } from '../../shared/middleware/authorize'
import { AppError } from '../../shared/errors/app-error'
import type { ActivationInput, CreateUserInput, ListUsersInput, UpdateUserInput } from './users.schema'

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as ListUsersInput
    const districtId = isCentralAdmin(req) ? query.districtId : getDistrictScope(req)
    if (!isCentralAdmin(req) && !districtId) {
      throw AppError.forbidden('District scope required')
    }
    const scopedQuery = { ...query, districtId: districtId ?? undefined }
    const { data, total } = await usersService.listUsers(scopedQuery)
    res.json(paginatedResponse(data, total, scopedQuery))
  } catch (err) {
    next(err)
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const districtId = isCentralAdmin(req) ? null : getDistrictScope(req)
    if (!isCentralAdmin(req) && !districtId) {
      throw AppError.forbidden('District scope required')
    }
    const user = await usersService.getUser(req.params.id as string, districtId)
    res.json({ data: user })
  } catch (err) {
    next(err)
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.createUser(req.body as CreateUserInput, req.auth!.userId)
    res.status(201).json({ data: user })
  } catch (err) {
    next(err)
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.updateUser(req.params.id as string, req.body as UpdateUserInput, req.auth!.userId)
    res.json({ data: user })
  } catch (err) {
    next(err)
  }
}

export async function updateUserActivation(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body as ActivationInput
    const user = await usersService.updateUser(req.params.id as string, input, req.auth!.userId)
    res.json({ data: user })
  } catch (err) {
    next(err)
  }
}
