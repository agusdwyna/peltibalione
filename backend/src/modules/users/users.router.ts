import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import {
  activationSchema,
  createUserSchema,
  listUsersSchema,
  updateUserSchema,
  userIdSchema,
} from './users.schema'
import { createUser, getUser, listUsers, updateUser, updateUserActivation } from './users.controller'

export const usersRouter = Router()

usersRouter.use(authenticate)

// User reads are available to both admin roles; handlers enforce district scope.
usersRouter.get(
  '/',
  authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }),
  validate(listUsersSchema, 'query'),
  listUsers,
)
usersRouter.get(
  '/:id',
  authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN'] }),
  validate(userIdSchema, 'params'),
  getUser,
)

// User mutations remain CENTRAL_ADMIN-only.
usersRouter.post('/', authorize({ roles: ['CENTRAL_ADMIN'] }), validate(createUserSchema), createUser)
usersRouter.patch(
  '/:id',
  authorize({ roles: ['CENTRAL_ADMIN'] }),
  validate(userIdSchema, 'params'),
  validate(updateUserSchema),
  updateUser,
)
usersRouter.patch(
  '/:id/activation',
  authorize({ roles: ['CENTRAL_ADMIN'] }),
  validate(userIdSchema, 'params'),
  validate(activationSchema),
  updateUserActivation,
)
