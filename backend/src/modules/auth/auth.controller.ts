import { Request, Response, NextFunction } from 'express'
import { loginSchema } from './auth.schema'
import * as authService from './auth.service'

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body)
    const result = await authService.login(input)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getCurrentUser(req.auth!.userId)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export async function logout(_req: Request, res: Response) {
  // Stateless JWT — client discards token. Revocation can be added later.
  res.json({ message: 'Logged out' })
}
