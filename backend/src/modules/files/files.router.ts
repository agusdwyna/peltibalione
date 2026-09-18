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

/**
 * Jenis entity ditentukan server dari `kind`, bukan diterima mentah, supaya
 * pengunggah tidak bisa menyamarkan berkas sebagai tipe lain saat diklaim.
 */
function publicUploadEntityType(kind: unknown): string {
  if (kind === 'achievement') return 'SUBMISSION_ACHIEVEMENT'
  if (kind === 'facility') return 'FACILITY_SUBMISSION_PHOTO'
  if (kind === 'amenity') return 'FACILITY_AMENITY_PHOTO'
  if (kind === 'coach') return 'COACH_SUBMISSION_PHOTO'
  if (kind === 'coach-certificate') return 'COACH_CERTIFICATE'
  if (kind === 'official') return 'OFFICIAL_SUBMISSION_PHOTO'
  if (kind === 'official-certificate') return 'OFFICIAL_CERTIFICATE'
  return 'SUBMISSION_PHOTO'
}

/**
 * Berkas sertifikat pelatih (§7) & wasit (§6) boleh berupa PDF selain gambar.
 * Hanya `kind` ini yang dilonggarkan; kolom foto tetap gambar saja.
 */
function allowsPdf(kind: unknown): boolean {
  return kind === 'coach-certificate' || kind === 'official-certificate'
}

/**
 * Validasi tipe berkas: MIME harus ada di allowlist DAN isi berkas harus cocok
 * dengan MIME yang diklaim, supaya .exe yang diganti nama tidak lolos.
 * Mengembalikan ekstensi aman yang diturunkan dari MIME, bukan dari nama file.
 */
function assertUploadType(mimeType: string, buffer: Buffer, pdfAllowed: boolean): string {
  const allowedMimes = pdfAllowed ? ['image/jpeg', 'image/png', 'application/pdf'] : ['image/jpeg', 'image/png']
  if (!allowedMimes.includes(mimeType)) {
    throw AppError.badRequest('INVALID_TYPE', pdfAllowed
      ? 'Only PDF, JPEG and PNG files are allowed'
      : 'Only JPEG and PNG files are allowed')
  }

  const isJpeg = mimeType === 'image/jpeg' && buffer.length >= 3
    && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const isPng = mimeType === 'image/png' && buffer.length >= 8
    && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  // %PDF
  const isPdf = mimeType === 'application/pdf' && buffer.length >= 5
    && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46

  if (!isJpeg && !isPng && !isPdf) {
    throw AppError.badRequest('INVALID_CONTENT', 'File content does not match the declared type')
  }

  return mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/png' ? '.png' : '.pdf'
}

// Public photo upload (no auth) — used by the public registration form (foto diri / foto prestasi)
filesRouter.post('/public/upload', publicUploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw AppError.badRequest('NO_FILE', 'No file uploaded')
    }
    const { mimetype, originalname, size, buffer } = req.file
    const ext = assertUploadType(mimetype, buffer, allowsPdf(req.body.kind))
    const safeName = `${randomUUID()}${ext}`
    const file = await persistFile({
      buffer,
      filename: safeName,
      originalName: path.basename(originalname),
      mimeType: mimetype,
      size,
      uploadedBy: req.auth?.userId,
      entityType: publicUploadEntityType(req.body.kind),
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
    const kind = req.body?.kind

    // 1–3. MIME allowlist + content sniffing; ekstensi diturunkan dari MIME,
    // bukan dari nama berkas yang dikirim klien.
    const ext = assertUploadType(mimetype, buffer, allowsPdf(kind))
    const safeName = `${randomUUID()}${ext}`

    // 4. Persist — write buffer to disk and record metadata (PRD §46).
    // `kind` hanya menandai peruntukan berkas; tipe akhirnya tetap ditentukan
    // server agar tidak bisa disamarkan oleh pengunggah.
    const typedKinds = ['facility', 'amenity', 'coach', 'coach-certificate', 'official', 'official-certificate']
    const file = await persistFile({
      buffer,
      filename: safeName,
      originalName: path.basename(originalname), // strip any directory component
      mimeType: mimetype,
      size,
      uploadedBy: req.auth?.userId,
      entityType: typedKinds.includes(kind) ? publicUploadEntityType(kind) : undefined,
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
