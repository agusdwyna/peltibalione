import { Request, Response, NextFunction } from 'express'
import { createClubSchema } from './clubs.schema'
import * as clubsService from './clubs.service'

export async function createClub(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createClubSchema.parse(req.body)
    const club = await clubsService.createClub(input, req.auth!.userId)
    res.status(201).json({ data: club })
  } catch (err) {
    next(err)
  }
}