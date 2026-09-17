import { FormEvent, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { useWorkspaceStore } from '../../stores/workspace.store'
import FacilityFormFields, { type FacilityPhoto } from './FacilityFormFields'
import { draftsToInput, findUnnamedCustom, type AmenityDraft } from './AmenityEditor'
import { readFacilityForm } from './facility-form'

export default function FacilitySubmissionPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isCentral = user?.roles.some((role) => role.role === 'CENTRAL_ADMIN') ?? false
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [photos, setPhotos] = useState<FacilityPhoto[]>([])
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null)
  const [amenityDrafts, setAmenityDrafts] = useState<AmenityDraft[]>([])
  const submitLock = useRef(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || submitLock.current) return
    if (!photos.length) { setError('Minimal satu foto lapangan wajib diunggah.'); return }
    // Central admin menulis ke workspace yang sedang dipilih, bukan lintas wilayah.
    if (isCentral && !workspace?.id) { setError('Pilih satu workspace distrik terlebih dahulu.'); return }
    if (findUnnamedCustom(amenityDrafts)) { setError('Setiap sarana tambahan harus diberi nama.'); return }
    submitLock.current = true
    setError(''); setMessage(''); setSubmitting(true)
    const element = event.currentTarget
    const payload = readFacilityForm(new FormData(element), photos.map((photo) => photo.id), coverPhotoId, draftsToInput(amenityDrafts))
    try {
      await api.facilitySubmissions.createDirect(token, { ...payload, districtId: isCentral ? workspace?.id : undefined })
      setMessage('Data lapangan tersimpan sebagai pengajuan. Lanjutkan ke Review Lapangan untuk verifikasi dan penetapan grade.')
      element.reset()
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
      setPhotos([]); setCoverPhotoId(null); setAmenityDrafts([])
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Pengajuan tidak dapat dikirim. Periksa kembali isian.')
    } finally { setSubmitting(false); submitLock.current = false }
  }

  return (
    <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6"><Link className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" to="/facilities">← Kembali ke fasilitas lapangan</Link></div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 md:text-3xl">Tambah Lapangan</h1>
        <p className="mt-2 text-sm text-gray-500">Masuk sebagai pengajuan, lalu diverifikasi di Review Lapangan.</p>
      </div>

      <form onSubmit={submit} className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-700/60 dark:bg-gray-800 sm:p-8">
        <div className="space-y-6">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
          {message && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700" role="status">{message}<button type="button" className="mt-2 block font-medium text-green-800 underline hover:text-green-900" onClick={() => navigate('/facilities/review')}>Buka Review Lapangan →</button></div>}
          <FacilityFormFields
            photos={photos}
            setPhotos={setPhotos}
            coverPhotoId={coverPhotoId}
            setCoverPhotoId={setCoverPhotoId}
            amenityDrafts={amenityDrafts}
            setAmenityDrafts={setAmenityDrafts}
            onUploadError={setError}
            token={token}
          />
        </div>
        <div className="mt-8 flex justify-end border-t border-gray-100 pt-6 dark:border-gray-700/60">
          <button className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={submitting}>{submitting ? 'Menyimpan…' : 'Simpan Pengajuan'}</button>
        </div>
      </form>
    </div>
  )
}
