import fs from 'fs/promises'
import path from 'path'
import { prisma } from '../../shared/database/prisma'
import { env } from '../../config/env'

interface PersistFileInput {
  buffer: Buffer
  filename: string
  originalName: string
  mimeType: string
  size: number
  uploadedBy?: string
  // optional linkage — used when tying a photo to a player/submission entity
  entityType?: string
  entityId?: string
  playerId?: string
  submissionId?: string
}

/**
 * PRD §46 — persist file to disk and record metadata in DB.
 * Object storage swap-in point lives here (storageKey becomes the object key).
 */
export async function persistFile(input: PersistFileInput) {
  const dir = path.resolve(env.UPLOAD_DIR)
  await fs.mkdir(dir, { recursive: true })

  const storageKey = input.filename
  await fs.writeFile(path.join(dir, storageKey), input.buffer)

  const file = await prisma.file.create({
    data: {
      entityType: input.entityType ?? 'GENERAL',
      entityId: input.entityId,
      storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.size,
      uploadedBy: input.uploadedBy,
      playerId: input.playerId,
      submissionId: input.submissionId,
    },
  })

  return file
}

/**
 * Hapus berkas dari disk sekaligus barisnya di DB. Berkas yang sudah hilang
 * dari disk tidak dianggap galat — baris DB tetap harus ikut bersih.
 */
export async function deleteStoredFile(fileId: string) {
  const file = await prisma.file.findUnique({ where: { id: fileId } })
  if (!file) return null

  const dir = path.resolve(env.UPLOAD_DIR)
  const absolute = path.resolve(dir, file.storageKey)
  // Jangan pernah menghapus di luar direktori upload lewat storageKey yang dibuat-buat.
  if (absolute.startsWith(dir)) {
    await fs.rm(absolute, { force: true })
  }

  await prisma.file.delete({ where: { id: fileId } })
  return file
}