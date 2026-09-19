import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../../shared/database/prisma'
import { AppError } from '../../shared/errors/app-error'
import {
  PUBLIC_COACH_STATUS,
  PUBLIC_FACILITY_STATUS,
  PUBLIC_OFFICIAL_STATUS,
  PUBLIC_PLAYER_STATUSES,
  ageInYears,
  yearOnly,
} from '../../shared/utils/public-visibility'

/**
 * Detail entitas untuk portal publik (tanpa login).
 *
 * Seluruh permukaan publik dikumpulkan dalam satu berkas supaya bisa diaudit
 * sekaligus: siapa pun yang ingin tahu "data apa saja yang terbuka" cukup
 * membaca berkas ini dari atas ke bawah, tanpa harus menelusuri setiap router.
 *
 * Aturan yang dipegang di sini:
 *
 *  1. Field sensitif TIDAK PERNAH diambil — ditegakkan di `select`, bukan
 *     dengan menghapus setelah query. Yang tidak pernah masuk ke memori tidak
 *     mungkin bocor karena satu baris lupa.
 *  2. Hanya entitas terverifikasi yang dapat diakses.
 *  3. Kunci URL memakai kode resmi (PL-/CO-/RF-/FC-), bukan UUID internal —
 *     kode itu memang untuk dikutip, sedangkan UUID tidak perlu terbuka.
 *  4. Riwayat pindah kabupaten tidak pernah ditampilkan: itu catatan
 *     administratif internal, bukan informasi publik.
 */

export const publicRouter = Router()

/** Batas longgar — halaman detail dipanggil sekali per kunjungan, bukan per gambar. */
const publicDetailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan. Coba lagi nanti.' } },
})

publicRouter.use(publicDetailLimiter)

/** Kode resmi selalu berformat XX-XXX-000000 — dipakai untuk menolak input liar lebih awal. */
const CODE_PATTERN = /^[A-Z]{2}-[A-Z]{3}-\d{6}$/

function assertCode(value: unknown): string {
  const code = String(value ?? '').toUpperCase()
  if (!CODE_PATTERN.test(code)) throw AppError.badRequest('INVALID_CODE', 'Kode tidak valid')
  return code
}

/** Semua entri publik menjawab 404 dengan pesan yang sama, agar tidak membocorkan keberadaan data. */
function notFound(what: string) {
  return AppError.notFound(`${what} tidak ditemukan atau belum terverifikasi.`)
}

// ── Pemain ────────────────────────────────────────────────────────────────
// NIK, tanggal lahir, alamat, kontak, dan foto diri tidak pernah diambil.
// Foto diri khususnya: pemain KU 8–18 adalah anak-anak.
publicRouter.get('/players/:code', async (req, res, next) => {
  try {
    const code = assertCode(req.params.code)
    const player = await prisma.player.findUnique({
      where: { playerCode: code },
      select: {
        playerCode: true,
        fullName: true,
        gender: true,
        ageGroup: true,
        status: true,
        birthDate: true, // diambil hanya untuk menghitung umur, tidak dikirim apa adanya
        district: { select: { name: true, code: true } },
        club: { select: { name: true } },
        pnpRankings: {
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: { rank: true, period: true },
        },
        trackRecords: {
          orderBy: { eventDate: 'desc' },
          select: { title: true, eventName: true, category: true, result: true, eventDate: true },
        },
        certificates: {
          orderBy: { issuedAt: 'desc' },
          select: { title: true, issuer: true, issuedAt: true },
        },
      },
    })

    if (!player || !PUBLIC_PLAYER_STATUSES.includes(player.status as never)) throw notFound('Pemain')

    res.json({
      data: {
        playerCode: player.playerCode,
        fullName: player.fullName,
        gender: player.gender,
        ageGroup: player.ageGroup,
        // Umur memakai selisih tahun — rumus yang sama dengan resolveAgeGroup,
        // supaya tidak berbeda dari kelompok umur yang tersimpan.
        age: ageInYears(player.birthDate),
        status: player.status,
        district: player.district,
        clubName: player.club?.name ?? null,
        pnpRankings: player.pnpRankings.map((row) => ({ rank: row.rank, period: row.period })),
        // Prestasi & sertifikat dikirim TANPA tanggal persis — hanya tahunnya.
        // Tanggal pertandingan yang lengkap mempublikasikan pola pergerakan
        // seorang anak; tahunnya sudah cukup memberi konteks.
        achievements: player.trackRecords.map((row) => ({
          title: row.title,
          eventName: row.eventName,
          category: row.category,
          result: row.result,
          year: yearOnly(row.eventDate),
        })),
        certificates: player.certificates.map((row) => ({
          title: row.title,
          issuer: row.issuer,
          year: yearOnly(row.issuedAt),
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// ── Pelatih ───────────────────────────────────────────────────────────────
// NIK, tanggal lahir, alamat, dan kontak tidak diambil. Foto profil boleh
// tampil (lihat files.access.ts) karena pelatih mendaftar sendiri dan
// fotonya berfungsi sebagai identitas profesional.
publicRouter.get('/coaches/:code', async (req, res, next) => {
  try {
    const code = assertCode(req.params.code)
    const coach = await prisma.coach.findUnique({
      where: { coachCode: code },
      select: {
        coachCode: true,
        fullName: true,
        gender: true,
        coachStatus: true,
        coachingSince: true,
        clubName: true,
        athleteCategories: true,
        activeAthletes: true,
        specializations: true,
        otherSpecialization: true,
        acceptingNewAthletes: true,
        experience: true,
        photoId: true,
        // Diambil hanya untuk memeriksa kelayakan tampil, tidak ikut dikirim.
        verificationStatus: true,
        district: { select: { name: true, code: true } },
        certificates: {
          orderBy: { sortOrder: 'asc' },
          select: { name: true, level: true, issuer: true, year: true },
        },
      },
    })

    if (!coach || coach.verificationStatus !== PUBLIC_COACH_STATUS) throw notFound('Pelatih')

    res.json({
      data: {
        coachCode: coach.coachCode,
        fullName: coach.fullName,
        gender: coach.gender,
        coachStatus: coach.coachStatus,
        coachingSince: coach.coachingSince,
        // Pengalaman dihitung server-side supaya tidak bisa berbeda dari tahunnya.
        experienceYears: coach.coachingSince ? Math.max(0, new Date().getFullYear() - coach.coachingSince) : null,
        clubName: coach.clubName,
        athleteCategories: coach.athleteCategories,
        activeAthletes: coach.activeAthletes,
        specializations: coach.specializations,
        otherSpecialization: coach.otherSpecialization,
        acceptingNewAthletes: coach.acceptingNewAthletes,
        experience: coach.experience,
        photoId: coach.photoId,
        district: coach.district,
        certificates: coach.certificates,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ── Wasit ─────────────────────────────────────────────────────────────────
// Riwayat turnamen ditampilkan LENGKAP (termasuk tahun & lokasi) karena wasit
// adalah orang dewasa dan ini rekam jejak profesionalnya — berbeda dari
// prestasi pemain yang sengaja dibatasi tahunnya.
publicRouter.get('/officials/:code', async (req, res, next) => {
  try {
    const code = assertCode(req.params.code)
    const official = await prisma.official.findUnique({
      where: { officialCode: code },
      select: {
        officialCode: true,
        fullName: true,
        gender: true,
        officialStatus: true,
        officiatingSince: true,
        roles: true,
        level: true,
        acceptingAssignments: true,
        experience: true,
        photoId: true,
        // Diambil hanya untuk memeriksa kelayakan tampil, tidak ikut dikirim.
        verificationStatus: true,
        district: { select: { name: true, code: true } },
        tournaments: {
          orderBy: [{ year: 'desc' }, { sortOrder: 'asc' }],
          select: { name: true, year: true, level: true, role: true, location: true },
        },
        certificates: {
          orderBy: { sortOrder: 'asc' },
          select: { name: true, level: true, issuer: true, year: true },
        },
      },
    })

    if (!official || official.verificationStatus !== PUBLIC_OFFICIAL_STATUS) throw notFound('Wasit')

    res.json({
      data: {
        officialCode: official.officialCode,
        fullName: official.fullName,
        gender: official.gender,
        officialStatus: official.officialStatus,
        officiatingSince: official.officiatingSince,
        experienceYears: Math.max(0, new Date().getFullYear() - official.officiatingSince),
        roles: official.roles,
        level: official.level,
        acceptingAssignments: official.acceptingAssignments,
        experience: official.experience,
        photoId: official.photoId,
        district: official.district,
        tournaments: official.tournaments,
        certificates: official.certificates,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ── Lapangan ──────────────────────────────────────────────────────────────
// Satu-satunya entitas yang kontaknya boleh tampil: nomor PIC adalah kontak
// tempat usaha (orang menghubungi untuk menyewa), bukan kontak pribadi yang
// dititipkan. `adminNotes` dan `verifiedBy` tidak pernah diambil.
publicRouter.get('/facilities/:code', async (req, res, next) => {
  try {
    const code = assertCode(req.params.code)
    const facility = await prisma.facility.findUnique({
      where: { facilityCode: code },
      select: {
        facilityCode: true,
        name: true,
        address: true,
        mapsUrl: true,
        description: true,
        latitude: true,
        longitude: true,

        courtCount: true,
        courtType: true,
        surface: true,
        courtLength: true,
        courtWidth: true,
        clearanceBack: true,
        clearanceLeft: true,
        clearanceRight: true,
        surfaceCondition: true,
        hasLighting: true,
        lightCount: true,
        netCondition: true,

        operationalStatus: true,
        openTime: true,
        closeTime: true,
        accessType: true,
        hourlyRate: true,

        grade: true,
        verificationStatus: true,

        managerName: true,
        picName: true,
        picPhone: true,

        district: { select: { name: true, code: true } },
        coverPhotoId: true,
        photos: { select: { id: true }, orderBy: { createdAt: 'asc' } },
        amenities: {
          orderBy: { sortOrder: 'asc' },
          select: {
            code: true,
            customName: true,
            description: true,
            photos: { select: { id: true }, orderBy: { createdAt: 'asc' } },
          },
        },
      },
    })

    if (!facility || facility.verificationStatus !== PUBLIC_FACILITY_STATUS) throw notFound('Lapangan')

    res.json({
      data: {
        facilityCode: facility.facilityCode,
        name: facility.name,
        address: facility.address,
        mapsUrl: facility.mapsUrl,
        description: facility.description,
        latitude: facility.latitude,
        longitude: facility.longitude,

        courtCount: facility.courtCount,
        courtType: facility.courtType,
        surface: facility.surface,
        courtLength: facility.courtLength,
        courtWidth: facility.courtWidth,
        clearanceBack: facility.clearanceBack,
        clearanceLeft: facility.clearanceLeft,
        clearanceRight: facility.clearanceRight,
        surfaceCondition: facility.surfaceCondition,
        hasLighting: facility.hasLighting,
        lightCount: facility.lightCount,
        netCondition: facility.netCondition,

        operationalStatus: facility.operationalStatus,
        openTime: facility.openTime,
        closeTime: facility.closeTime,
        accessType: facility.accessType,
        hourlyRate: facility.hourlyRate,

        grade: facility.grade,
        district: facility.district,

        // Kontak pengelola — satu-satunya kontak yang tampil di portal publik.
        managerName: facility.managerName,
        picName: facility.picName,
        picPhone: facility.picPhone,

        coverPhotoId: facility.coverPhotoId,
        photoIds: facility.photos.map((photo) => photo.id),
        amenities: facility.amenities.map((amenity) => ({
          code: amenity.code,
          customName: amenity.customName,
          description: amenity.description,
          photoIds: amenity.photos.map((photo) => photo.id),
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})
