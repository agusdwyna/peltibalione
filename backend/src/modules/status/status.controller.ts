import { Request, Response, NextFunction } from 'express'
import { checkStatusSchema, createAccountSchema } from './status.schema'
import * as statusService from './status.service'

export async function check(req: Request, res: Response, next: NextFunction) {
  try {
    const query = checkStatusSchema.parse(req.query)
    const result = await statusService.checkStatus(query.nik, query.fullName)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function createAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createAccountSchema.parse(req.body)
    const result = await statusService.createAccountForPlayer(input.playerId, input.nik, input.fullName)
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}