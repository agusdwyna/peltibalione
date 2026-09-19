import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import AuthenticatedImage from '../../components/ui/AuthenticatedImage'
import { useAuthStore } from '../../stores/auth.store'
import { useWorkspaceStore } from '../../stores/workspace.store'
import FacilitySpecs from './FacilitySpecs'
import BackLink from '../../components/portal/BackLink'
import type { FacilityGrade, FacilitySubmissionDetail } from '../../types/facility'

export default function FacilityReviewDetailPage() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isAllRegions = useWorkspaceStore((state) => state.isAllRegions)
  const [submission, setSubmission] = useState<FacilitySubmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState<{ id: string; label: string } | null>(null)
  const [grade, setGrade] = useState<FacilityGrade | ''>('')
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  // Detail milik satu distrik; central admin harus menyertakan workspace terpilih.
  const scopeDistrictId = isAllRegions ? submission?.form?.district.id : workspace?.id

  useEffect(() => {
    if (!token || !submissionId) return
    setLoading(true); setError('')
    api.facilitySubmissions
      .get(token, submissionId, isAllRegions ? undefined : workspace?.id)
      .then(setSubmission)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Detail pengajuan tidak dapat dimuat.'))
      .finally(() => setLoading(false))
  }, [token, submissionId, workspace?.id, isAllRegions])

  const review = async (action: 'LINK' | 'REJECT') => {
    if (!token || !submission || processing) return
    if (action === 'REJECT' && !rejectionReason.trim()) { setError('Alasan penolakan wajib diisi.'); return }
    setProcessing(true); setError('')
    try {
      await api.facilitySubmissions.review(token, submission.id, {
        action,
        districtId: isAllRegions ? scopeDistrictId : workspace?.id,
        ...(action === 'REJECT'
          ? { rejectionReason: rejectionReason.trim() }
          : { verificationStatus: 'TERVERIFIKASI', grade: grade || undefined, adminNotes: adminNotes.trim() || undefined }),
      })
      navigate('/facilities/review', { replace: true })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Pengajuan tidak dapat diproses.')
    } finally { setProcessing(false) }
  }

  if (loading) return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8"><p className="text-sm text-gray-500">Memuat detail…</p></div>
  if (!submission) return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
    <BackLink to="/facilities/review" label="Kembali ke review lapangan" />
    <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'Pengajuan tidak ditemukan.'}</div>
  </div>

  return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-6"><BackLink to="/facilities/review" label="Kembali ke review lapangan" /></div>
    {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}

    <section className="rounded-xl bg-white p-6 shadow-xs dark:bg-gray-800 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-700/60">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Detail pengajuan lapangan</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">{submission.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{submission.form?.district.name ?? '—'} · {submission.form?.title ?? '—'}</p>
        </div>
        <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700">{submission.status}</span>
      </div>

      <div className="mt-7"><FacilitySpecs facility={submission} onPhotoClick={(id, label) => setLightbox({ id, label })} /></div>

      <div className="mt-7 border-t border-gray-100 pt-5 dark:border-gray-700/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Verifikasi &amp; Grade</p>
        <p className="mt-1 text-xs text-gray-500">Tanggal dan admin verifikator dicatat otomatis oleh sistem saat pengajuan disetujui.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Grade Lapangan</span>
            <select className="form-select w-full" value={grade} onChange={(event) => setGrade(event.target.value as FacilityGrade | '')}>
              <option value="">Belum ditentukan</option>
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Catatan Admin</span>
            <textarea className="form-textarea w-full" rows={3} maxLength={2000} value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} />
          </label>
        </div>

        {rejecting && <label className="mt-5 block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Alasan Penolakan <span className="text-red-500">*</span></span>
          <textarea className="form-textarea w-full" rows={2} maxLength={1000} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
        </label>}
      </div>

      <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-700/60">
        {rejecting
          ? <>
            <button className="btn border border-gray-200 bg-white text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" disabled={processing} onClick={() => { setRejecting(false); setRejectionReason('') }}>Batal</button>
            <button className="btn bg-red-600 text-sm text-white disabled:opacity-50" disabled={processing} onClick={() => review('REJECT')}>{processing ? 'Memproses…' : 'Konfirmasi Tolak'}</button>
          </>
          : <>
            <button className="btn border border-red-200 bg-white text-sm text-red-600 dark:border-red-800 dark:bg-gray-800" disabled={processing} onClick={() => setRejecting(true)}>Tolak</button>
            <button className="btn bg-gray-900 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800" disabled={processing} onClick={() => review('LINK')}>{processing ? 'Memproses…' : 'Setujui & buat master lapangan'}</button>
          </>}
      </div>
    </section>

    {lightbox && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={lightbox.label}>
      <button className="absolute inset-0 cursor-zoom-out bg-gray-950/70" aria-label="Tutup pratinjau" onClick={() => setLightbox(null)} />
      <div className="relative max-h-full w-full max-w-3xl">
        <p className="mb-2 text-center text-sm font-medium text-white">{lightbox.label} · {submission.name}</p>
        <AuthenticatedImage fileId={lightbox.id} alt={lightbox.label} className="mx-auto max-h-[75vh] w-auto rounded-lg object-contain" />
        <div className="mt-3 text-center"><button type="button" className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20" onClick={() => setLightbox(null)}>Tutup</button></div>
      </div>
    </div>}
  </div>
}
