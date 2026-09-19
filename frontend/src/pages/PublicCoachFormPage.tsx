import { FormEvent, useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import CoachFormFields, { type CoachPhoto } from '../modules/coaches/CoachFormFields'
import PublicFormShell from '../components/portal/PublicFormShell'
import FormClosedNotice from './FormClosedNotice'
import { FORM_SUBJECT } from '../lib/form-kind'
import {
  certificateDraftsToInput,
  findUnnamedCertificate,
  type CertificateDraft,
} from '../components/certificates/CertificateEditor'
import { readCoachForm, validateCoachForm } from '../modules/coaches/coach-form'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

type PublicForm = { id: string; title: string; description?: string | null; type?: string; district: { name: string } }

export default function PublicCoachFormPage() {
  const { token } = useParams<{ token: string }>()
  const location = useLocation()
  const [form, setForm] = useState<PublicForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [photo, setPhoto] = useState<CoachPhoto | null>(null)
  const [certificateDrafts, setCertificateDrafts] = useState<CertificateDraft[]>([])
  const submitLock = useRef(false)

  useEffect(() => {
    if (!token) {
      setError('Token form tidak valid.')
      setLoading(false)
      return
    }
    fetch(`${API_BASE_URL}/forms/public/${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error()
        return response.json() as Promise<PublicForm>
      })
      .then((payload) => {
        // Token form pemain / lapangan tidak boleh membuka form pelatih.
        if (payload.type && payload.type !== 'COACH_REGISTRATION') {
          setError('Link ini bukan form pendataan pelatih.')
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
    if (findUnnamedCertificate(certificateDrafts)) {
      setError('Setiap lisensi / sertifikat harus diberi nama.')
      return
    }

    // React mengosongkan currentTarget setelah handler selesai — simpan dulu.
    const element = event.currentTarget
    const payload = readCoachForm(new FormData(element), photo?.id ?? null, certificateDraftsToInput(certificateDrafts))
    const invalid = validateCoachForm(payload)
    if (invalid) {
      setError(invalid)
      return
    }

    submitLock.current = true
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      await api.coachSubmissions.createPublic({ ...payload, formToken: token })
      setMessage('Data pelatih berhasil dikirim. Admin PELTI akan meninjau dan memverifikasi data Anda.')
      element.reset()
      if (photo) URL.revokeObjectURL(photo.previewUrl)
      setPhoto(null)
      setCertificateDrafts([])
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Data tidak dapat dikirim. Periksa kembali isian Anda.')
    } finally {
      setSubmitting(false)
      submitLock.current = false
    }
  }

  // Tanpa token artinya form belum dibuka — bukan error, cukup dijelaskan.
  if (!token) return <FormClosedNotice subject={FORM_SUBJECT.coach} districtName={(location.state as { districtName?: string } | null)?.districtName} />

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Memuat form…</div>

  return (
    <PublicFormShell
      eyebrow="Pendataan Pelatih"
      title={form?.title ?? 'Pendataan Pelatih Tenis'}
      description={form?.description}
      districtName={form?.district.name}
      asideTitle="Sebelum mengisi"
      asidePoints={[
        'Siapkan NIK (16 digit) dan foto profil berukuran maksimal 4MB.',
        'Lampirkan lisensi atau sertifikat kepelatihan bila ada.',
        'Pengalaman melatih dihitung otomatis dari tahun mulai melatih.',
      ]}
      message={message}
    >
      {!form && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      {!message && form && (
        <form onSubmit={submit} className="space-y-8">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          <CoachFormFields
            photo={photo}
            setPhoto={setPhoto}
            certificateDrafts={certificateDrafts}
            setCertificateDrafts={setCertificateDrafts}
            onUploadError={setError}
          />
          <div className="flex justify-end border-t border-gray-100 pt-6 dark:border-gray-700/60">
            <button
              className="btn bg-gray-900 px-5 text-sm text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Mengirim…' : 'Kirim Data Pelatih'}
            </button>
          </div>
        </form>
      )}
    </PublicFormShell>
  )
}
