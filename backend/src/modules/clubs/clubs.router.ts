import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import { prisma } from '../../shared/database/prisma'
import { createClub } from './clubs.controller'

export const clubsRouter = Router()

clubsRouter.use(authenticate)

// GET /api/clubs — list clubs
clubsRouter.get('/', async (_req, res, next) => {
  try {
    const clubs = await prisma.club.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { players: true } } },
    })
    res.json({ data: clubs })
  } catch (err) {
    next(err)
  }
})

// POST /api/clubs — create club (central admin only)
clubsRouter.post('/', authorize({ roles: ['CENTRAL_ADMIN'] }), createClub)