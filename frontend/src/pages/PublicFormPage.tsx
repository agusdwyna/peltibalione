import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { Gender } from '../types/portal'

export default function PublicFormPage() {
  const { token } = useParams<{ token: string }>()
  const [form, setForm] = useState<{ id: string; title: string; description?: string | null; district: { name: string } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [achievementPhotoId, setAchievementPhotoId] = useState<string | null>(null)
  const [achievementPreviewUrl, setAchievementPreviewUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [achievementUploading, setAchievementUploading] = useState(false)
  const submitLock = useRef(false)

  useEffect(() => {
    if (!token) { setError('Token form tidak valid.'); setLoading(false); return }
    Promise.all([
      fetch(`${API_BASE_URL}/forms/public/${token}`).then(async (r) => { if (!r.ok) throw Error(); return r.json() }),
    ])
      .then(([f]) => { setForm(f) })
      .catch(() => setError('Form tidak ditemukan atau sudah ditutup.'))
      .finally(() => setLoading(false))
  }, [token])

  const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

  const uploadPhoto = async (file: File, field: 'photoId' | 'achievementPhotoId') => {
    if (field === 'photoId') setPhotoUploading(true)
    else setAchievementUploading(true)
    try {
      const result = await api.files.uploadPublic(file, field)
      const previewUrl = URL.createObjectURL(file)
      if (field === 'photoId') {
        setPhotoId(result.id)
        setPhotoPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return previewUrl })
      } else {
        setAchievementPhotoId(result.id)
        setAchievementPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return previewUrl })
      }
    } catch {
      setError('Foto gagal diupload. Pastikan format JPEG/PNG dan ukuran maksimal 4MB.')
    } finally {
      if (field === 'photoId') setPhotoUploading(false)
      else setAchievementUploading(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    if (submitLock.current) return
    submitLock.current = true
    setError(''); setMessage(''); setSubmitting(true)
    // React nulls `currentTarget` once the handler returns, so keep a reference
    // before awaiting — otherwise reset() throws after a successful submit.
    const form = event.currentTarget
    const fd = new FormData(form)
    try {
      await api.submissions.createPublic({
        formToken: token,
        fullName: String(fd.get('fullName') ?? ''),
        nik: String(fd.get('nik') ?? '') || undefined,
        birthPlace: String(fd.get('birthPlace') ?? ''),
        birthDate: String(fd.get('birthDate') ?? ''),
        address: String(fd.get('address') ?? ''),
        phone: String(fd.get('phone') ?? ''),
        instagram: String(fd.get('instagram') ?? '') || undefined,
        whatsapp: String(fd.get('whatsapp') ?? '') || undefined,
        gender: String(fd.get('gender') ?? '') as Gender,
        pnpRank: Number(fd.get('pnpRank') ?? '') || undefined,
        pnpPeriod: String(fd.get('pnpPeriod') ?? '') || '2026',
        photoId: photoId ?? undefined,
        achievementPhotoId: achievementPhotoId ?? undefined,
      })
      setMessage('Pendaftaran berhasil dikirim! Data Anda akan ditinjau oleh admin. Silakan cek status secara berkala melalui halaman Cek Status.')
      form.reset()
      setPhotoId(null); setPhotoPreviewUrl(null); setAchievementPhotoId(null); setAchievementPreviewUrl(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pengajuan tidak dapat dikirim. Periksa kembali data Anda.')
    } finally { setSubmitting(false); submitLock.current = false }
  }

  const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200'
  const sectionClass = 'rounded-lg border border-gray-200 bg-gray-50/60 p-5 dark:border-gray-700/60 dark:bg-gray-900/20'

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Memuat form…</div>

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-700/60 dark:bg-gray-800">
          <div className="px-6 py-6 sm:px-8">
            <p className="text-xs uppercase tracking-wide text-gray-400">Form Pendaftaran Pemain</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">{form?.title ?? 'Pendaftaran Pemain'}</h1>
            {form?.description && <p className="mt-2 text-sm text-gray-500">{form.description}</p>}
            {form && <p className="mt-4 inline-block rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700">{form.district.name}</p>}
          </div>

          {message && <div className="mx-6 mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 sm:mx-8" role="status">{message}<a className="mt-2 block font-medium text-green-800 underline hover:text-green-900" href="/check-status">Cek status pendaftaran →</a></div>}

          {!message && form && (
            <form onSubmit={submit} className="space-y-6 border-t border-gray-100 px-6 py-6 dark:border-gray-700/60 sm:px-8">
              {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}

              <section className={sectionClass}>
                <div className="mb-5"><h2 className="font-semibold text-gray-800 dark:text-gray-100">Data Diri</h2><p className="mt-1 text-xs text-gray-500">NIK digunakan untuk pemeriksaan duplikat dan cek status.</p></div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="sm:col-span-2"><span className={labelClass}>Nama Lengkap <span className="text-red-500">*</span></span><input className="form-input w-full" name="fullName" required /></label>
                  <label className="sm:col-span-2"><span className={labelClass}>NIK <span className="text-red-500">*</span></span><input className="form-input w-full" name="nik" pattern="\d{16}" title="16 digit angka" required /><span className="mt-1 block text-xs text-gray-500">16 digit, digunakan untuk cek status pendaftaran.</span></label>
                  <label><span className={labelClass}>Tempat Lahir</span><input className="form-input w-full" name="birthPlace" /></label>
                  <label><span className={labelClass}>Tanggal Lahir <span className="text-red-500">*</span></span><input className="form-input w-full" name="birthDate" type="date" required /></label>
                  <label className="sm:col-span-2"><span className={labelClass}>Alamat</span><textarea className="form-textarea w-full" name="address" rows={3} /></label>
                </div>
              </section>

              <section className={sectionClass}>
                <div className="mb-5"><h2 className="font-semibold text-gray-800 dark:text-gray-100">Kategori & Kontak</h2><p className="mt-1 text-xs text-gray-500">Kelompok umur ditentukan otomatis dari tanggal lahir &amp; jenis kelamin.</p></div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label><span className={labelClass}>Jenis Kelamin <span className="text-red-500">*</span></span><select className="form-select w-full" name="gender" required><option value="">Pilih jenis kelamin</option><option value="PUTRA">Laki-laki</option><option value="PUTRI">Perempuan</option></select></label>
                  <label><span className={labelClass}>No. WhatsApp <span className="text-red-500">*</span></span><input className="form-input w-full" name="whatsapp" type="tel" required placeholder="08xxxxxxxxxx" /></label>
                  <label className="sm:col-span-2"><span className={labelClass}>Akun Instagram Aktif <span className="text-red-500">*</span></span><input className="form-input w-full" name="instagram" required placeholder="@username" /></label>
                  <label><span className={labelClass}>Peringkat PNP (Juni 2026) <span className="font-normal text-gray-400">(opsional)</span></span><input className="form-input w-full" name="pnpRank" type="number" min="1" placeholder="Peringkat" /></label>
                </div>
              </section>

              <section className={sectionClass}>
                <div className="mb-5"><h2 className="font-semibold text-gray-800 dark:text-gray-100">Foto</h2><p className="mt-1 text-xs text-gray-500">JPEG/PNG, maksimal 4MB per foto.</p></div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div><span className={labelClass}>Foto Diri <span className="text-red-500">*</span></span>
                    {photoId && photoPreviewUrl ? <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"><img className="h-24 w-24 object-cover" src={photoPreviewUrl} alt="Preview foto diri" /><button type="button" className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/80 text-sm text-white hover:bg-gray-900" aria-label="Hapus foto diri" onClick={() => { URL.revokeObjectURL(photoPreviewUrl); setPhotoId(null); setPhotoPreviewUrl(null) }}>×</button></div> : <>
                      <input className="block w-full text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:text-gray-100" type="file" accept="image/jpeg,image/png" required={!photoId} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f, 'photoId') }} />
                      {photoUploading && <span className="mt-1 block text-xs text-violet-600">Mengunggah…</span>}
                    </>}
                  </div>
                  <div><span className={labelClass}>Foto Prestasi <span className="font-normal text-gray-400">(opsional)</span></span>
                    {achievementPhotoId && achievementPreviewUrl ? <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"><img className="h-24 w-24 object-cover" src={achievementPreviewUrl} alt="Preview foto prestasi" /><button type="button" className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/80 text-sm text-white hover:bg-gray-900" aria-label="Hapus foto prestasi" onClick={() => { URL.revokeObjectURL(achievementPreviewUrl); setAchievementPhotoId(null); setAchievementPreviewUrl(null) }}>×</button></div> : <>
                      <input className="block w-full text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:text-gray-100" type="file" accept="image/jpeg,image/png" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f, 'achievementPhotoId') }} />
                      {achievementUploading && <span className="mt-1 block text-xs text-violet-600">Mengunggah…</span>}
                    </>}
                  </div>
                </div>
              </section>

              <div className="flex justify-end border-t border-gray-100 pt-6 dark:border-gray-700/60">
                <button className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={submitting || photoUploading || achievementUploading}>{submitting ? 'Mengirim…' : 'Kirim Pengajuan'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
