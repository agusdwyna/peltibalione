import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { check, createAccount, searchFacilities } from './status.controller'

export const statusRouter = Router()

/**
 * Endpoint cek status bersifat publik dan menjawab "NIK ini terdaftar atau
 * tidak", jadi tanpa pembatas ia menjadi alat enumerasi NIK. PRD §Keamanan
 * mensyaratkan rate limit pada jalur publik.
 */
const statusCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Terlalu banyak pemeriksaan. Coba lagi nanti.' } },
})

/**
 * Pembatas terpisah untuk pencarian lapangan — sengaja lebih longgar.
 *
 * Berbagi kuota dengan /check akan salah: data lapangan sudah tampil di peta
 * publik, jadi pencarian tidak membuka rahasia apa pun, sedangkan /check
 * menjawab "NIK ini terdaftar atau tidak". Kuota bersama membuat pengunjung
 * yang cuma mengetik beberapa kata kunci kehabisan jatah dan lalu diblokir
 * dari cek status — membatasi hal yang tidak sensitif dengan harga mahal.
 */
const facilitySearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Terlalu banyak pencarian. Coba lagi nanti.' } },
})

/**
 * Jeda respons bertingkat per-IP.
 *
 * Rate limit di atas membatasi per-IP, tetapi penyerang dapat berpindah IP
 * sehingga tiap IP baru memperoleh kuota penuh. Jeda ini membuat setiap
 * percobaan memakan waktu, sehingga enumerasi massal jadi tidak praktis
 * walau IP-nya diputar.
 *
 * Sengaja memakai penghitung sendiri, bukan membaca header dari limiter:
 * nilainya harus tersedia sebelum respons ditulis, dan urutan internal
 * pustaka bukan hal yang boleh diandalkan.
 */
const WINDOW_MS = 15 * 60 * 1000
const MIN_DELAY_MS = 300
const MAX_DELAY_MS = 3000
/** Batas atas jumlah IP yang dilacak, supaya memori tidak tumbuh tanpa batas. */
const MAX_TRACKED = 5000

const attempts = new Map<string, { count: number; resetAt: number }>()

function pruneExpired(now: number) {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key)
  }
}

function nextDelay(key: string): number {
  const now = Date.now()
  // Pembersihan berkala — hanya saat peta sudah cukup besar.
  if (attempts.size > MAX_TRACKED) pruneExpired(now)

  const entry = attempts.get(key)
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return MIN_DELAY_MS
  }

  entry.count += 1
  // Perlambatan tumbuh linear terhadap jumlah percobaan, dibatasi MAX_DELAY_MS.
  const ratio = Math.min(entry.count / 10, 1)
  return Math.round(MIN_DELAY_MS + (MAX_DELAY_MS - MIN_DELAY_MS) * ratio)
}

function escalatingDelay(req: Parameters<typeof check>[0], _res: Parameters<typeof check>[1], next: () => void) {
  setTimeout(next, nextDelay(req.ip ?? 'unknown'))
}

// GET /api/status/check — public: cek status verifikasi via NIK + Nama
statusRouter.get('/check', statusCheckLimiter, escalatingDelay, check)

// GET /api/status/facilities — public: cari lapangan terverifikasi via nama/alamat.
// Limiter sendiri yang lebih longgar dan tanpa jeda bertingkat: kuncinya bukan
// NIK, jadi tidak ada rahasia yang bisa dienumerasi lewat kecepatan respons.
statusRouter.get('/facilities', facilitySearchLimiter, searchFacilities)

// POST /api/status/create-account — public: pembuatan akun (dibatasi sama ketat)
statusRouter.post('/create-account', statusCheckLimiter, escalatingDelay, createAccount)
