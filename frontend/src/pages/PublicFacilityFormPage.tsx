import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import FacilityFormFields, { type FacilityPhoto } from '../modules/facilities/FacilityFormFields'
import { draftsToInput, findUnnamedCustom, type AmenityDraft } from '../modules/facilities/AmenityEditor'
import { readFacilityForm } from '../modules/facilities/facility-form'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api'

type PublicForm = { id: string; title: string; description?: string | null; type?: string; district: { name: string } }

export default function PublicFacilityFormPage() {
  const { token } = useParams<{ token: string }>()
  const [form, setForm] = useState<PublicForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [photos, setPhotos] = useState<FacilityPhoto[]>([])
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null)
  const [amenityDrafts, setAmenityDrafts] = useState<AmenityDraft[]>([])
  const submitLock = useRef(false)

  useEffect(() => {
    if (!token) { setError('Token form tidak valid.'); setLoading(false); return }
    fetch(`${API_BASE_URL}/forms/public/${encodeURIComponent(token)}`)
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<PublicForm> })
      .then((payload) => {
        // Token form pemain tidak boleh membuka form lapangan.
        if (payload.type && payload.type !== 'FACILITY_REGISTRATION') {
          setError('Link ini bukan form pendataan lapangan.')
          return
        }
        setForm(payload)
      })
      .catch(() => setError('Form tidak ditemukan atau sudah ditutup.'))
      .finally(() => setLoading(false))
  }, [token])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || submitLock.current) return
    if (!photos.length) { setError('Minimal satu foto lapangan wajib diunggah.'); return }
    if (findUnnamedCustom(amenityDrafts)) { setError('Setiap sarana tambahan harus diberi nama.'); return }
    submitLock.current = true
    setError(''); setMessage(''); setSubmitting(true)
    // React mengosongkan currentTarget setelah handler selesai — simpan dulu.
    const element = event.currentTarget
    const payload = readFacilityForm(new FormData(element), photos.map((photo) => photo.id), coverPhotoId, draftsToInput(amenityDrafts))
    try {
      await api.facilitySubmissions.createPublic({ ...payload, formToken: token })
      setMessage('Data lapangan berhasil dikirim. Admin PELTI akan meninjau dan menetapkan grade lapangan.')
      element.reset()
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
      setPhotos([]); setCoverPhotoId(null); setAmenityDrafts([])
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Data tidak dapat dikirim. Periksa kembali isian Anda.')
    } finally { setSubmitting(false); submitLock.current = false }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Memuat form…</div>

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-700/60 dark:bg-gray-800">
          <div className="px-6 py-6 sm:px-8">
            <p className="text-xs uppercase tracking-wide text-gray-400">Pendataan Lapangan</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">{form?.title ?? 'Pendataan Lapangan Tenis'}</h1>
            {form?.description && <p className="mt-2 text-sm text-gray-500">{form.description}</p>}
            {form && <p className="mt-4 inline-block rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700">{form.district.name}</p>}
          </div>

          {message && <div className="mx-6 mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 sm:mx-8" role="status">{message}</div>}
          {!form && error && <div className="mx-6 mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:mx-8" role="alert">{error}</div>}

          {!message && form && (
            <form onSubmit={submit} className="space-y-6 border-t border-gray-100 px-6 py-6 dark:border-gray-700/60 sm:px-8">
              {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
              <FacilityFormFields
                photos={photos}
                setPhotos={setPhotos}
                coverPhotoId={coverPhotoId}
                setCoverPhotoId={setCoverPhotoId}
                amenityDrafts={amenityDrafts}
                setAmenityDrafts={setAmenityDrafts}
                onUploadError={setError}
              />
              <div className="flex justify-end border-t border-gray-100 pt-6 dark:border-gray-700/60">
                <button className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={submitting}>{submitting ? 'Mengirim…' : 'Kirim Data Lapangan'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
