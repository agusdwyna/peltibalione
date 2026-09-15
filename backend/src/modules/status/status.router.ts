import { Router } from 'express'
import { check, createAccount } from './status.controller'

export const statusRouter = Router()

// GET /api/status/check — public: cek status verifikasi via NIK + Nama
statusRouter.get('/check', check)

// POST /api/status/create-account — public: buat akun otomatis untuk pemain terverifikasi
statusRouter.post('/create-account', createAccount)