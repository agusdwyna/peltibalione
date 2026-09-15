import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env'
import { errorHandler } from './shared/middleware/error-handler'
import { authRouter } from './modules/auth/auth.router'
import { usersRouter } from './modules/users/users.router'
import { districtsRouter } from './modules/districts/districts.router'
import { playersRouter } from './modules/players/players.router'
import { clubsRouter } from './modules/clubs/clubs.router'
import { formsRouter } from './modules/forms/forms.router'
import { submissionsRouter } from './modules/submissions/submissions.router'
import { verificationRouter } from './modules/verification/verification.router'
import { auditRouter } from './modules/audit/audit.router'
import { filesRouter } from './modules/files/files.router'
import { statsRouter } from './modules/stats/stats.router'
import { statusRouter } from './modules/status/status.router'

const app = express()

// ── Global middleware ──────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(express.json({ limit: '1mb' }))

// ── Health check ───────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/districts', districtsRouter)
app.use('/api/players', playersRouter)
app.use('/api/clubs', clubsRouter)
app.use('/api/forms', formsRouter)
app.use('/api/submissions', submissionsRouter)
app.use('/api/verification', verificationRouter)
app.use('/api/audit', auditRouter)
app.use('/api/files', filesRouter)
app.use('/api/stats', statsRouter)
app.use('/api/status', statusRouter)

// ── Error handling ─────────────────────────────────────────────
app.use(errorHandler)

// ── Start ──────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`[pelti-api] running on http://localhost:${env.PORT}`)
})
