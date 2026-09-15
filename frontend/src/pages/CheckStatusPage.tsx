import { FormEvent, useState } from 'react'
import { api, ApiError } from '../lib/api'
import type { CheckStatusResult } from '../types/portal'

const submissionStatusLabel: Record<string, string> = { SUBMITTED: 'Menunggu Verifikasi', CREATED: 'Pemain Dibuat', REJECTED: 'Ditolak' }

export default function CheckStatusPage() {
  const [nik, setNik] = useState('')
  const [fullName, setFullName] = useState('')
  const [result, setResult] = useState<CheckStatusResult | null>(null)
  const [account, setAccount] = useState<{ email: string; password: string; name: string } | null>(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [creating, setCreating] = useState(false)

  const isVerified = result?.playerStatus === 'VERIFIED'
  const districtLabel = result?.district?.name === 'Denpasar' ? 'Kota Denpasar' : result?.district?.name ? `Kabupaten ${result.district.name}` : '—'

  const check = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setResult(null); setAccount(null); setChecking(true)
    try {
      setResult(await api.status.check(nik, fullName))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Terjadi kesalahan.')
    } finally { setChecking(false) }
  }

  const createAccount = async () => {
    if (!result?.playerId) return
    setError(''); setCreating(true)
    try {
      setAccount(await api.status.createAccount(result.playerId, nik, fullName))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuat akun.')
    } finally { setCreating(false) }
  }

  const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200'

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-700/60 dark:bg-gray-800">
          <div className="px-6 py-6 sm:px-8">
            <p className="text-xs uppercase tracking-wide text-gray-400">PELTI Bali One</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">Cek Status Pendaftaran</h1>
            <p className="mt-2 text-sm text-gray-500">Masukkan NIK dan Nama Lengkap Anda untuk melihat status verifikasi.</p>
          </div>

          <form onSubmit={check} className="space-y-4 border-t border-gray-100 px-6 py-6 dark:border-gray-700/60 sm:px-8">
            <label className="block"><span className={labelClass}>NIK <span className="text-red-500">*</span></span><input className="form-input w-full" value={nik} onChange={(e) => setNik(e.target.value)} pattern="\d{16}" title="16 digit" required /></label>
            <label className="block"><span className={labelClass}>Nama Lengkap <span className="text-red-500">*</span></span><input className="form-input w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
            <div className="flex justify-end">
              <button className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={checking}>{checking ? 'Memeriksa…' : 'Cek Status'}</button>
            </div>
          </form>

          {result && (
            <div className="space-y-4 border-t border-gray-100 px-6 py-6 dark:border-gray-700/60 sm:px-8">
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status Pendaftaran</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${result.playerStatus === 'VERIFIED' ? 'bg-green-500/15 text-green-700' : result.submissionStatus === 'REJECTED' ? 'bg-red-500/15 text-red-700' : 'bg-amber-500/15 text-amber-700'}`}>{result.playerStatus === 'VERIFIED' ? 'Pemain Terverifikasi' : submissionStatusLabel[result.submissionStatus] ?? result.submissionStatus}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">{result.fullName}</p>
                {result.playerStatus === 'VERIFIED' && <div className="mt-4 grid gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-200"><div className="flex justify-between"><span>ID Pemain</span><strong className="font-mono">{result.playerCode ?? '—'}</strong></div><div className="flex justify-between gap-4"><span>Terdaftar sebagai</span><strong className="text-right">Pemain {districtLabel}</strong></div></div>}
                {result.rejectionReason && <p className="mt-2 text-sm text-red-600">{result.rejectionReason}</p>}
              </div>

              {isVerified && !account && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/40">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">Anda terverifikasi sebagai Pemain PELTI.</p>
                  <p className="mt-1 text-sm text-green-700">Buat akun untuk mengakses portal peserta Anda.</p>
                  <button className="btn mt-4 bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:opacity-50" onClick={createAccount} disabled={creating}>{creating ? 'Membuat akun…' : 'Buat Akun'}</button>
                </div>
              )}

              {account && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/40">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">Akun berhasil dibuat.</p>
                  <div className="mt-3 space-y-2 text-sm text-green-700">
                    <div className="flex justify-between"><span>Email</span><span className="font-mono font-medium">{account.email}</span></div>
                    <div className="flex justify-between"><span>Password</span><span className="font-mono font-medium">{account.password}</span></div>
                  </div>
                  <p className="mt-3 text-xs text-green-700">Gunakan kredensial ini untuk login ke akun pemain Anda.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}