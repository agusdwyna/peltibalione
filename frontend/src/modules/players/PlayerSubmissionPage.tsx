import { FormEvent, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { useWorkspaceStore } from '../../stores/workspace.store'
import type { AgeGroup } from '../../types/portal'

export default function PlayerSubmissionPage() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isCentral = user?.roles.some((role) => role.role === 'CENTRAL_ADMIN') ?? false
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [achievementPhotoId, setAchievementPhotoId] = useState<string | null>(null)

  useEffect(() => {
    api.ageGroups.list().then(setAgeGroups).catch(() => {})
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(''); setMessage(''); setSubmitting(true)
    const fd = new FormData(event.currentTarget)
    if (!photoId) {
      setError('Foto diri wajib diunggah sebelum mengirim pengajuan.')
      setSubmitting(false)
      return
    }
    try {
      const result = await api.submissions.createDirect(token!, {
        fullName: String(fd.get('fullName') ?? ''),
        nik: String(fd.get('nik') ?? '') || undefined,
        birthPlace: String(fd.get('birthPlace') ?? ''),
        birthDate: String(fd.get('birthDate') ?? ''),
        address: String(fd.get('address') ?? ''),
        phone: String(fd.get('phone') ?? ''),
        instagram: String(fd.get('instagram') ?? '') || undefined,
        whatsapp: String(fd.get('whatsapp') ?? '') || undefined,
        ageGroup: String(fd.get('ageGroup') ?? '') || undefined,
        pnpRank: Number(fd.get('pnpRank') ?? '') || undefined,
        pnpPeriod: '2026',
        photoId: photoId ?? undefined,
        achievementPhotoId: achievementPhotoId ?? undefined,
        districtId: isCentral ? workspace?.id : undefined,
      })
      setMessage(`Pengajuan berhasil dikirim. Duplikat: ${result.duplicateMatch}.`)
      event.currentTarget.reset()
      setPhotoId(null); setAchievementPhotoId(null)
    } catch {
      setError('Pengajuan tidak dapat dikirim. Pastikan ada form aktif dan data benar.')
    } finally { setSubmitting(false) }
  }

  const sectionClass = 'rounded-lg border border-gray-200 bg-gray-50/60 p-5 dark:border-gray-700/60 dark:bg-gray-900/20'
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200'

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 w-full max-w-9xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Tambah Pemain</h1>
        <p className="mt-2 text-sm text-gray-500">Data pemain langsung terikat pada form pendaftaran aktif di workspace ini.</p>
      </div>

      <form onSubmit={submit} className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-700/60 dark:bg-gray-800 sm:p-8">
        <div className="space-y-6">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
          {message && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700" role="status">{message}</div>}

          <section className={sectionClass}>
            <div className="mb-5"><h2 className="font-semibold text-gray-800 dark:text-gray-100">Data Diri</h2><p className="mt-1 text-xs text-gray-500">NIK digunakan untuk pemeriksaan duplikat.</p></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className={labelClass}>Nama Lengkap <span className="text-red-500">*</span></span><input className="form-input w-full" name="fullName" required /></label>
              <label className="sm:col-span-2"><span className={labelClass}>NIK <span className="text-red-500">*</span></span><input className="form-input w-full" name="nik" pattern="\d{16}" title="16 digit" required /><span className="mt-1 block text-xs text-gray-500">16 digit.</span></label>
              <label><span className={labelClass}>Tempat Lahir</span><input className="form-input w-full" name="birthPlace" /></label>
              <label><span className={labelClass}>Tanggal Lahir</span><input className="form-input w-full" name="birthDate" type="date" /></label>
              <label className="sm:col-span-2"><span className={labelClass}>Alamat</span><textarea className="form-textarea w-full" name="address" rows={3} /></label>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-5"><h2 className="font-semibold text-gray-800 dark:text-gray-100">Kategori & Kontak</h2></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label><span className={labelClass}>Kelompok Umur <span className="text-red-500">*</span></span>
                <select className="form-select w-full" name="ageGroup" required>
                  <option value="">Pilih KU</option>
                  {ageGroups.map((g) => <option key={g.id} value={g.code}>{g.name}</option>)}
                </select>
              </label>
              <label><span className={labelClass}>No. WhatsApp <span className="text-red-500">*</span></span><input className="form-input w-full" name="whatsapp" type="tel" required /></label>
              <label className="sm:col-span-2"><span className={labelClass}>Akun Instagram <span className="text-red-500">*</span></span><input className="form-input w-full" name="instagram" required /></label>
              <label><span className={labelClass}>Peringkat PNP (opsional)</span><input className="form-input w-full" name="pnpRank" type="number" min="1" /></label>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-5"><h2 className="font-semibold text-gray-800 dark:text-gray-100">Foto</h2><p className="mt-1 text-xs text-gray-500">JPEG/PNG maksimal 4MB. Unggah dulu sebelum submit.</p></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><span className={labelClass}>Foto Diri <span className="text-red-500">*</span></span>
                {photoId ? <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">Terunggah ✓</div>
                  : <input className="block w-full text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:text-gray-100" type="file" accept="image/jpeg,image/png" required={!photoId} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const r = await api.files.uploadPublic(f, 'photoId'); setPhotoId(r.id) } catch { setError('Upload gagal.') } }} />}
              </div>
              <div><span className={labelClass}>Foto Prestasi <span className="font-normal text-gray-400">(opsional)</span></span>
                {achievementPhotoId ? <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">Terunggah ✓</div>
                  : <input className="block w-full text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:text-gray-100" type="file" accept="image/jpeg,image/png" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const r = await api.files.uploadPublic(f, 'achievementPhotoId'); setAchievementPhotoId(r.id) } catch { setError('Upload gagal.') } }} />}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 flex justify-end border-t border-gray-100 pt-6 dark:border-gray-700/60">
          <button className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={submitting}>{submitting ? 'Mengirim…' : 'Kirim Pengajuan'}</button>
        </div>
      </form>
    </div>
  )
}