import { Router } from 'express'
import { login, me, logout } from './auth.controller'
import { authenticate } from '../../shared/middleware/authenticate'

export const authRouter = Router()

authRouter.post('/login', login)
authRouter.get('/me', authenticate, me)
authRouter.post('/logout', authenticate, logout)
