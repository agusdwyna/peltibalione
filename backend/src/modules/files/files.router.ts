import { Router } from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { randomUUID } from 'crypto'
import path from 'path'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import { env } from '../../config/env'
import { persistFile } from './files.service'

// PRD §22 — memory storage with explicit content validation (size limit enforced below),
// then persisted to object storage/filesystem by the service layer.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE },
})

// Rate limit public uploads to deter abuse
const publicUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many uploads. Try again later.' } },
})

export const filesRouter = Router()

// Public photo upload (no auth) — used by the public registration form (foto diri / foto prestasi)
filesRouter.post('/public/upload', publicUploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw AppError.badRequest('NO_FILE', 'No file uploaded')
    }
    const { mimetype, originalname, size, buffer } = req.file
    const allowedMimes = ['image/jpeg', 'image/png']
    if (!allowedMimes.includes(mimetype)) {
      throw AppError.badRequest('INVALID_TYPE', 'Only JPEG and PNG files are allowed')
    }
    const ext = mimetype === 'image/jpeg' ? '.jpg' : '.png'
    const isJpeg = mimetype === 'image/jpeg' && buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    const isPng = mimetype === 'image/png' && buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
    if (!isJpeg && !isPng) {
      throw AppError.badRequest('INVALID_CONTENT', 'File content does not match the declared image type')
    }
    const safeName = `${randomUUID()}${ext}`
    const file = await persistFile({
      buffer,
      filename: safeName,
      originalName: path.basename(originalname),
      mimeType: mimetype,
      size,
      uploadedBy: req.auth?.userId,
      entityType: req.body.kind === 'achievement' ? 'SUBMISSION_ACHIEVEMENT' : 'SUBMISSION_PHOTO',
    })
    res.status(201).json({ data: { id: file.id } })
  } catch (err) {
    next(err)
  }
})

filesRouter.use(authenticate)

// GET /api/files/:id — stream an uploaded image to an authorized admin session.
filesRouter.get('/:id', authorize({ roles: ['CENTRAL_ADMIN', 'DISTRICT_ADMIN', 'PLAYER'] }), async (req, res, next) => {
  try {
    const id = String(req.params.id)
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) throw AppError.badRequest('INVALID_ID', 'Invalid file id')
    const file = await prisma.file.findUnique({ where: { id } })
    if (!file) throw AppError.notFound('File not found')
    const dir = path.resolve(env.UPLOAD_DIR)
    const absolute = path.resolve(dir, file.storageKey)
    // Never allow escaping the upload directory via a crafted storage key.
    if (!absolute.startsWith(dir)) throw AppError.forbidden('Invalid file path')
    res.type(file.mimeType || 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.sendFile(absolute, (error) => {
      if (error && !res.headersSent) next(AppError.notFound('File content not found'))
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/files/upload — upload file (JPEG/PNG only, ≤4MB)
filesRouter.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw AppError.badRequest('NO_FILE', 'No file uploaded')
    }

    const { mimetype, originalname, size, buffer } = req.file

    // 1. MIME type allowlist
    const allowedMimes = ['image/jpeg', 'image/png']
    if (!allowedMimes.includes(mimetype)) {
      throw AppError.badRequest('INVALID_TYPE', 'Only JPEG and PNG files are allowed')
    }

    // 2. Extension allowlist (derived from the asserted MIME type, not the client filename)
    const ext = mimetype === 'image/jpeg' ? '.jpg' : '.png'
    const safeName = `${randomUUID()}${ext}`

    // 3. Content sniffing — verify magic bytes so a renamed .exe can't masquerade as an image
    const isJpeg = mimetype === 'image/jpeg' && buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    const isPng =
      mimetype === 'image/png' &&
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    if (!isJpeg && !isPng) {
      throw AppError.badRequest('INVALID_CONTENT', 'File content does not match the declared image type')
    }

    // 4. Persist — write buffer to disk and record metadata (PRD §46)
    const file = await persistFile({
      buffer,
      filename: safeName,
      originalName: path.basename(originalname), // strip any directory component
      mimeType: mimetype,
      size,
      uploadedBy: req.auth?.userId,
    })

    res.status(201).json({
      data: {
        id: file.id,
        filename: safeName,
        originalName: file.originalName,
        mimeType: mimetype,
        size,
      },
    })
  } catch (err) {
    next(err)
  }
})
