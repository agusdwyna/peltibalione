import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { districtLabel } from '../lib/district'
import type { CheckStatusResult, FacilitySearchResult, StatusEntry, StatusRole } from '../types/portal'
import { courtTypeLabel } from '../types/facility'

type Mode = 'registration' | 'facility'

const MODES: Array<[Mode, string]> = [
  ['registration', 'Status Pendaftaran'],
  ['facility', 'Cari Lapangan'],
]

const ROLE_LABEL: Record<StatusRole, string> = {
  PLAYER: 'Pemain',
  COACH: 'Pelatih',
  OFFICIAL: 'Wasit',
}

/** Warna badge mengikuti makna: hijau hanya untuk yang benar-benar terverifikasi. */
type Tone = 'green' | 'amber' | 'red' | 'gray'

const TONE_CLASS: Record<Tone, string> = {
  green: 'bg-green-500/15 text-green-700 dark:text-green-400',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  red: 'bg-red-500/15 text-red-700 dark:text-red-400',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

/**
 * Status master berbeda enum antar peran: pemain memakai PlayerStatus
 * (VERIFIED/ACTIVE/…), pelatih & wasit memakai TERVERIFIKASI. Yang ditampilkan
 * ke pengunjung harus satu bahasa, jadi keduanya dipetakan ke sini.
 */
const VERIFICATION: Record<string, { label: string; tone: Tone }> = {
  VERIFIED: { label: 'Terverifikasi', tone: 'green' },
  TERVERIFIKASI: { label: 'Terverifikasi', tone: 'green' },
  ACTIVE: { label: 'Aktif', tone: 'green' },
  MENUNGGU: { label: 'Menunggu verifikasi', tone: 'amber' },
  PENDING_VERIFICATION: { label: 'Menunggu verifikasi', tone: 'amber' },
  INACTIVE: { label: 'Tidak aktif', tone: 'gray' },
  ARCHIVED: { label: 'Diarsipkan', tone: 'gray' },
  DITOLAK: { label: 'Ditolak', tone: 'red' },
  REJECTED: { label: 'Ditolak', tone: 'red' },
}

const SUBMISSION: Record<string, { label: string; tone: Tone }> = {
  SUBMITTED: { label: 'Menunggu verifikasi', tone: 'amber' },
  UNDER_REVIEW: { label: 'Sedang ditinjau', tone: 'amber' },
  LINKED: { label: 'Terkait data resmi', tone: 'amber' },
  CREATED: { label: 'Data resmi dibuat', tone: 'green' },
  VERIFIED: { label: 'Terverifikasi', tone: 'green' },
  REJECTED: { label: 'Ditolak', tone: 'red' },
}

function Badge({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]}`}>{label}</span>
}

/** Status utama satu entri peran: utamakan status master, jatuh ke pengajuan. */
function entryStatus(entry: StatusEntry) {
  const master = entry.verification ? VERIFICATION[entry.verification] : undefined
  if (master) return master
  const submission = entry.submissionStatus ? SUBMISSION[entry.submissionStatus] : undefined
  return submission ?? { label: 'Menunggu verifikasi', tone: 'amber' as Tone }
}

const LABEL_CLASS = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200'
const CARD = 'rounded-xl border border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800'
const PRIMARY_BTN = 'btn bg-gray-900 px-5 text-sm text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900'
const ALERT = 'rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'

export default function CheckStatusPage() {
  const [mode, setMode] = useState<Mode>('registration')

  // ── Mode 1: status pendaftaran per NIK ──
  const [nik, setNik] = useState('')
  const [fullName, setFullName] = useState('')
  const [result, setResult] = useState<CheckStatusResult | null>(null)
  const [account, setAccount] = useState<{ email: string; password: string; name: string } | null>(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [creating, setCreating] = useState(false)

  // ── Mode 2: pencarian lapangan ──
  const [facilityQuery, setFacilityQuery] = useState('')
  const [facilityResult, setFacilityResult] = useState<FacilitySearchResult | null>(null)
  const [facilityError, setFacilityError] = useState('')
  const [searchingFacility, setSearchingFacility] = useState(false)

  const check = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setResult(null); setAccount(null); setChecking(true)
    try {
      setResult(await api.status.check(nik, fullName))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Terjadi kesalahan.')
    } finally { setChecking(false) }
  }

  const createAccount = async (playerId: string) => {
    setError(''); setCreating(true)
    try {
      setAccount(await api.status.createAccount(playerId, nik, fullName))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuat akun.')
    } finally { setCreating(false) }
  }

  const searchFacility = async (e: FormEvent) => {
    e.preventDefault()
    setFacilityError(''); setFacilityResult(null); setSearchingFacility(true)
    try {
      setFacilityResult(await api.status.searchFacilities(facilityQuery))
    } catch (err) {
      setFacilityError(err instanceof ApiError ? err.message : 'Pencarian gagal.')
    } finally { setSearchingFacility(false) }
  }

  /**
   * Pindah mode hanya membersihkan pesan galat yang bersifat sementara.
   * Hasil pencarian dan — yang paling penting — kartu akun sengaja dibiarkan:
   * password di situ hanya ditampilkan sekali dan tidak bisa diminta ulang,
   * jadi memindahkan tab tidak boleh menghapusnya.
   */
  const changeMode = (next: Mode) => {
    setMode(next); setError(''); setFacilityError('')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 dark:bg-gray-900">
      <header className="border-b border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link className="inline-flex items-center gap-2.5" to="/" aria-label="PELTI Bali One">
            <svg className="h-8 w-8 fill-violet-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden><path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" /></svg>
            <span className="text-sm font-bold uppercase tracking-[0.16em] text-gray-800 dark:text-gray-100">PELTI Bali One</span>
          </Link>
          <Link className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" to="/">Kembali ke peta Bali</Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 pt-8 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Layanan Publik</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-[-0.02em] text-gray-900 dark:text-gray-100">Cek Data PELTI Bali</h1>
          <p className="mt-2 text-sm text-gray-500">
            Periksa status pendaftaran Anda sebagai pemain, pelatih, atau wasit — atau cari data lapangan terverifikasi.
          </p>
        </div>

        {/* Segmented control — dua kunci pencarian yang berbeda jenis (NIK vs
            nama lapangan), jadi masing-masing punya modenya sendiri. */}
        <nav className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100/70 p-1 dark:border-gray-700/60 dark:bg-gray-800/60" aria-label="Jenis pencarian">
          {MODES.map(([key, label]) => {
            const active = mode === key
            return <button
              key={key}
              type="button"
              className={`flex-1 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition ${active
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-500 hover:bg-white/70 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/40 dark:hover:text-gray-200'}`}
              onClick={() => changeMode(key)}
              aria-current={active ? 'true' : undefined}
            >
              {label}
            </button>
          })}
        </nav>

        {/* ── Mode 1: status pendaftaran ─────────────────────────── */}
        {mode === 'registration' && <>
          <form onSubmit={check} className={`mt-6 ${CARD} p-6 sm:p-8`}>
            <div className="space-y-4">
              <label className="block">
                <span className={LABEL_CLASS}>NIK <span className="text-red-500">*</span></span>
                <input className="form-input w-full" value={nik} onChange={(e) => setNik(e.target.value)} inputMode="numeric" pattern="\d{16}" title="16 digit" placeholder="16 digit" required />
              </label>
              <label className="block">
                <span className={LABEL_CLASS}>Nama Lengkap <span className="text-red-500">*</span></span>
                <input className="form-input w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </label>
            </div>
            {error && <div className={`mt-4 ${ALERT}`} role="alert">{error}</div>}
            <div className="mt-6 flex justify-end border-t border-gray-100 pt-5 dark:border-gray-700/60">
              <button className={PRIMARY_BTN} type="submit" disabled={checking}>{checking ? 'Memeriksa…' : 'Cek Status'}</button>
            </div>
          </form>

          {result && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Ditemukan {result.roles.length} peran terdaftar</h2>
                <p className="text-xs text-gray-400">NIK {result.nik}</p>
              </div>

              {result.roles.map((entry) => {
                const status = entryStatus(entry)
                const canCreateAccount = entry.role === 'PLAYER' && entry.verification === 'VERIFIED' && Boolean(entry.playerId)
                return <div key={entry.role} className={`${CARD} p-5`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ROLE_LABEL[entry.role]}</p>
                      <p className="mt-0.5 text-sm text-gray-500">{entry.fullName}</p>
                    </div>
                    <Badge label={status.label} tone={status.tone} />
                  </div>

                  <dl className="mt-4 grid gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">Kode</dt>
                      <dd className="font-mono text-xs text-gray-700 dark:text-gray-300">{entry.code ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">Wilayah</dt>
                      <dd className="text-right text-gray-700 dark:text-gray-300">{entry.district ? districtLabel(entry.district.name) : '—'}</dd>
                    </div>
                    {/* Status pengajuan hanya relevan selama belum jadi data resmi. */}
                    {!entry.verification && entry.submissionStatus && <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">Pengajuan</dt>
                      <dd className="text-right text-gray-700 dark:text-gray-300">{SUBMISSION[entry.submissionStatus]?.label ?? entry.submissionStatus}</dd>
                    </div>}
                  </dl>

                  {entry.rejectionReason && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">Alasan penolakan: {entry.rejectionReason}</p>}

                  {canCreateAccount && !account && <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/20">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Anda terverifikasi sebagai Pemain PELTI.</p>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-300">Buat akun untuk mengakses portal peserta Anda.</p>
                    <button type="button" className={`mt-3 ${PRIMARY_BTN}`} onClick={() => createAccount(entry.playerId!)} disabled={creating}>{creating ? 'Membuat akun…' : 'Buat Akun'}</button>
                  </div>}
                </div>
              })}

              {/* Akun yang dibuat selalu milik pemain, jadi kartunya ditaruh di
                  tingkat hasil — bukan di dalam kartu peran. */}
              {account && <div className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900/40 dark:bg-green-950/20" role="status">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Akun berhasil dibuat.</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-green-700 dark:text-green-300">Email</dt><dd className="font-mono font-medium text-green-800 dark:text-green-200">{account.email}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-green-700 dark:text-green-300">Password</dt><dd className="font-mono font-medium text-green-800 dark:text-green-200">{account.password}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-green-700 dark:text-green-300">Catat kredensial ini sekarang — password tidak ditampilkan lagi setelah halaman ditutup.</p>
              </div>}
            </div>
          )}
        </>}

        {/* ── Mode 2: pencarian lapangan ─────────────────────────── */}
        {mode === 'facility' && <>
          <form onSubmit={searchFacility} className={`mt-6 ${CARD} p-6 sm:p-8`}>
            <label className="block">
              <span className={LABEL_CLASS}>Nama atau alamat lapangan <span className="text-red-500">*</span></span>
              <input className="form-input w-full" value={facilityQuery} onChange={(e) => setFacilityQuery(e.target.value)} placeholder="Minimal 3 karakter" minLength={3} required />
            </label>
            <p className="mt-2 text-xs text-gray-400">Hanya lapangan yang sudah terverifikasi admin PELTI yang tampil di sini.</p>
            {facilityError && <div className={`mt-4 ${ALERT}`} role="alert">{facilityError}</div>}
            <div className="mt-6 flex justify-end border-t border-gray-100 pt-5 dark:border-gray-700/60">
              <button className={PRIMARY_BTN} type="submit" disabled={searchingFacility}>{searchingFacility ? 'Mencari…' : 'Cari Lapangan'}</button>
            </div>
          </form>

          {facilityResult && <div className="mt-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {facilityResult.facilities.length > 0
                ? `${facilityResult.facilities.length} lapangan ditemukan`
                : 'Lapangan tidak ditemukan'}
            </h2>

            {facilityResult.facilities.length === 0 && <div className={`${CARD} p-8 text-center`}>
              <p className="text-sm text-gray-600 dark:text-gray-300">Tidak ada lapangan terverifikasi yang cocok dengan “{facilityResult.query}”.</p>
              <p className="mt-1 text-sm text-gray-400">Coba kata kunci lain, atau lihat peta untuk menelusuri per wilayah.</p>
            </div>}

            {facilityResult.facilities.map((facility) => <div key={facility.facilityCode} className={`${CARD} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link className="text-sm font-semibold text-gray-900 hover:text-violet-700 hover:underline dark:text-gray-100 dark:hover:text-violet-400" to={`/lapangan/${facility.facilityCode}`}>{facility.name}</Link>
                  <p className="mt-0.5 text-sm text-gray-500">{facility.address}</p>
                </div>
                {facility.grade ? <Badge label={`Grade ${facility.grade}`} tone="green" /> : <span className="text-xs text-gray-400">Belum dinilai</span>}
              </div>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Kode</dt><dd className="font-mono text-xs text-gray-700 dark:text-gray-300">{facility.facilityCode}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Wilayah</dt><dd className="text-right text-gray-700 dark:text-gray-300">{facility.district ? districtLabel(facility.district.name) : '—'}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Court</dt><dd className="text-right text-gray-700 dark:text-gray-300">{facility.courtCount} · {courtTypeLabel(facility.courtType)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Jam operasional</dt><dd className="text-right text-gray-700 dark:text-gray-300">{facility.openTime && facility.closeTime ? `${facility.openTime}–${facility.closeTime}` : '—'}</dd></div>
              </dl>
            </div>)}
          </div>}
        </>}
      </div>
    </div>
  )
}
