import { FormEvent, useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import AgeGroupField from '../../components/portal/AgeGroupField'
import { useAuthStore } from '../../stores/auth.store'
import { useWorkspaceStore } from '../../stores/workspace.store'
import type { AgeGroup, Gender } from '../../types/portal'

export default function PlayerSubmissionPage() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isCentral = user?.roles.some((role) => role.role === 'CENTRAL_ADMIN') ?? false
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [achievementPhotoId, setAchievementPhotoId] = useState<string | null>(null)
  const [achievementPreviewUrl, setAchievementPreviewUrl] = useState<string | null>(null)
  const submitLock = useRef(false)

  // Kelompok umur hanya ditampilkan; server tetap yang menghitung.
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([])
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')

  useEffect(() => { api.ageGroups.list().then(setAgeGroups).catch(() => undefined) }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitLock.current) return
    submitLock.current = true
    setError(''); setMessage(''); setSubmitting(true)
    // React nulls `currentTarget` once the handler returns, so keep a reference
    // before awaiting — otherwise reset() throws after a successful submit.
    const form = event.currentTarget
    const fd = new FormData(form)
    if (!photoId) {
      setError('Foto diri wajib diunggah sebelum mengirim pengajuan.')
      setSubmitting(false); submitLock.current = false
      return
    }
    try {
      const result = await api.submissions.createDirect(token!, {
        fullName: String(fd.get('fullName') ?? ''),
        nik: String(fd.get('nik') ?? ''),
        birthPlace: String(fd.get('birthPlace') ?? ''),
        birthDate: String(fd.get('birthDate') ?? ''),
        address: String(fd.get('address') ?? ''),
        phone: String(fd.get('phone') ?? ''),
        instagram: String(fd.get('instagram') ?? '') || undefined,
        whatsapp: String(fd.get('whatsapp') ?? '') || undefined,
        gender: String(fd.get('gender') ?? '') as Gender,
        pnpRank: Number(fd.get('pnpRank') ?? '') || undefined,
        pnpPeriod: '2026',
        photoId: photoId ?? undefined,
        achievementPhotoId: achievementPhotoId ?? undefined,
        districtId: isCentral ? workspace?.id : undefined,
      })
      setMessage(`Pengajuan berhasil dikirim. Duplikat: ${result.duplicateMatch}.`)
      form.reset()
      // Tanggal lahir & jenis kelamin dikendalikan state, jadi form.reset()
      // saja tidak mengosongkannya di layar.
      setBirthDate(''); setGender('')
      setPhotoId(null); setPhotoPreviewUrl(null); setAchievementPhotoId(null); setAchievementPreviewUrl(null)
    } catch {
      setError('Pengajuan tidak dapat dikirim. Pastikan ada form aktif dan data benar.')
    } finally { setSubmitting(false); submitLock.current = false }
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
              <label><span className={labelClass}>Tanggal Lahir <span className="text-red-500">*</span></span><input className="form-input w-full" name="birthDate" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} required /></label>
              {/* Jenis kelamin berpasangan dengan tanggal lahir — keduanya
                  masukan yang menentukan kelompok umur di bawahnya. */}
              <label><span className={labelClass}>Jenis Kelamin <span className="text-red-500">*</span></span>
                <select className="form-select w-full" name="gender" value={gender} onChange={(event) => setGender(event.target.value as Gender | '')} required><option value="">Pilih jenis kelamin</option><option value="PUTRA">Laki-laki</option><option value="PUTRI">Perempuan</option></select>
              </label>
              <AgeGroupField groups={ageGroups} birthDate={birthDate} gender={gender} />
              <label className="sm:col-span-2"><span className={labelClass}>Alamat</span><textarea className="form-textarea w-full" name="address" rows={3} /></label>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-5"><h2 className="font-semibold text-gray-800 dark:text-gray-100">Kategori & Kontak</h2></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label><span className={labelClass}>No. WhatsApp <span className="text-red-500">*</span></span><input className="form-input w-full" name="whatsapp" type="tel" required /></label>
              <label><span className={labelClass}>Akun Instagram <span className="text-red-500">*</span></span><input className="form-input w-full" name="instagram" required /></label>
              <label><span className={labelClass}>Peringkat PNP (opsional)</span><input className="form-input w-full" name="pnpRank" type="number" min="1" /></label>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-5"><h2 className="font-semibold text-gray-800 dark:text-gray-100">Foto</h2><p className="mt-1 text-xs text-gray-500">JPEG/PNG maksimal 4MB. Unggah dulu sebelum submit.</p></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><span className={labelClass}>Foto Diri <span className="text-red-500">*</span></span>
                {photoId && photoPreviewUrl ? <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"><img className="h-24 w-24 object-cover" src={photoPreviewUrl} alt="Preview foto diri" /><button type="button" className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/80 text-sm text-white hover:bg-gray-900" aria-label="Hapus foto diri" onClick={() => { URL.revokeObjectURL(photoPreviewUrl); setPhotoId(null); setPhotoPreviewUrl(null) }}>×</button></div>
                  : <input className="block w-full text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:text-gray-100" type="file" accept="image/jpeg,image/png" required={!photoId} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const r = await api.files.uploadPublic(f, 'photoId'); setPhotoId(r.id); setPhotoPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(f) }) } catch { setError('Upload gagal.') } }} />}
              </div>
              <div><span className={labelClass}>Foto Prestasi <span className="font-normal text-gray-400">(opsional)</span></span>
                {achievementPhotoId && achievementPreviewUrl ? <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"><img className="h-24 w-24 object-cover" src={achievementPreviewUrl} alt="Preview foto prestasi" /><button type="button" className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/80 text-sm text-white hover:bg-gray-900" aria-label="Hapus foto prestasi" onClick={() => { URL.revokeObjectURL(achievementPreviewUrl); setAchievementPhotoId(null); setAchievementPreviewUrl(null) }}>×</button></div>
                  : <input className="block w-full text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:text-gray-100" type="file" accept="image/jpeg,image/png" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const r = await api.files.uploadPublic(f, 'achievementPhotoId'); setAchievementPhotoId(r.id); setAchievementPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(f) }) } catch { setError('Upload gagal.') } }} />}
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