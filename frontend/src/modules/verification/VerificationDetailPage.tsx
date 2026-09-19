import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import AuthenticatedImage from '../../components/ui/AuthenticatedImage'
import BackLink from '../../components/portal/BackLink'
import { useAuthStore } from '../../stores/auth.store'
import { useWorkspaceStore } from '../../stores/workspace.store'
import type { SubmissionDetail } from '../../types/portal'

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

export default function VerificationDetailPage() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isAllRegions = useWorkspaceStore((state) => state.isAllRegions)
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState<{ id: string; label: string } | null>(null)

  useEffect(() => {
    if (!token || !submissionId || (!workspace?.id && !isAllRegions)) return
    api.submissions.get(token, submissionId, isAllRegions ? undefined : workspace?.id)
      .then(setSubmission)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Detail pengajuan tidak dapat dimuat.'))
      .finally(() => setLoading(false))
  }, [token, submissionId, workspace?.id, isAllRegions])

  const review = async (action: 'LINK' | 'REJECT') => {
    if (!token || !submission || processing) return
    setProcessing(true); setError('')
    try {
      await api.submissions.review(token, submission.id, { action, districtId: isAllRegions ? undefined : workspace?.id, rejectionReason: action === 'REJECT' ? 'Ditolak setelah peninjauan admin.' : undefined })
      navigate('/verification', { replace: true })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Pengajuan tidak dapat diproses.')
    } finally { setProcessing(false) }
  }

  if (loading) return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8"><p className="text-sm text-gray-500">Memuat detail…</p></div>
  if (error || !submission) return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8"><BackLink to="/verification" label="Kembali ke verifikasi" /><div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'Pengajuan tidak ditemukan.'}</div></div>

  return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-6"><BackLink to="/verification" label="Kembali ke verifikasi" /></div>
    {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="rounded-xl bg-white p-6 shadow-xs dark:bg-gray-800 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-700/60"><div><p className="text-xs uppercase tracking-wide text-gray-400">Detail pengajuan</p><h1 className="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">{submission.fullName}</h1><p className="mt-1 text-sm text-gray-500">{submission.form?.district.name ?? '—'} · {submission.form?.title ?? '—'}</p></div><span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700">{submission.status}</span></div>
      <dl className="mt-7 grid gap-6 sm:grid-cols-2">{[['NIK', submission.nik], ['Tempat lahir', submission.birthPlace], ['Tanggal lahir', formatDate(submission.birthDate)], ['Kelompok umur', submission.ageGroup], ['WhatsApp', submission.whatsapp], ['Instagram', submission.instagram], ['Peringkat PNP', submission.pnpRank ? `${submission.pnpRank} (${submission.pnpPeriod ?? '—'})` : null], ['Alamat', submission.address]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt><dd className="mt-1 text-sm text-gray-800 dark:text-gray-100">{value || '—'}</dd></div>)}</dl>
      <div className="mt-7 border-t border-gray-100 pt-5 dark:border-gray-700/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lampiran</p>
        {(() => {
          const files = submission.files ?? []
          const profilePhoto = files.find((file) => file.entityType === 'SUBMISSION_PHOTO')
          const achievementPhoto = files.find((file) => file.entityType === 'SUBMISSION_ACHIEVEMENT')
          const others = files.filter((file) => file !== profilePhoto && file !== achievementPhoto)

          if (!files.length) return <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">Belum ada file</p>

          const Card = ({ file, label }: { file: { id: string; originalName: string }; label: string }) => (
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">{label}</p>
              <button type="button" className="block cursor-zoom-in" onClick={() => setLightbox({ id: file.id, label })} aria-label={`Perbesar ${label}`}>
                <AuthenticatedImage fileId={file.id} alt={`${label} ${submission.fullName}`} className="h-40 w-40 rounded-lg border border-gray-200 object-cover transition hover:border-violet-300 dark:border-gray-700" />
              </button>
              <p className="mt-1 max-w-[10rem] truncate text-xs text-gray-400">{file.originalName}</p>
            </div>
          )

          return <div className="mt-3 flex flex-wrap gap-6">
            {profilePhoto ? <Card file={profilePhoto} label="Foto diri" /> : <div><p className="mb-2 text-xs font-medium text-gray-500">Foto diri</p><div className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 dark:border-gray-700">Tidak ada</div></div>}
            {achievementPhoto && <Card file={achievementPhoto} label="Foto prestasi" />}
            {others.map((file) => <Card key={file.id} file={file} label="Lampiran lain" />)}
          </div>
        })()}
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-700/60"><button className="btn border border-red-200 bg-white text-sm text-red-600 dark:border-red-800 dark:bg-gray-800" disabled={processing} onClick={() => review('REJECT')}>Tolak</button><button className="btn bg-gray-900 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800" disabled={processing} onClick={() => review('LINK')}>{processing ? 'Memproses…' : 'Setujui & buat pemain'}</button></div>
    </section>

    {lightbox && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={lightbox.label}>
      <button className="absolute inset-0 cursor-zoom-out bg-gray-950/70" aria-label="Tutup pratinjau" onClick={() => setLightbox(null)} />
      <div className="relative max-h-full w-full max-w-3xl">
        <p className="mb-2 text-center text-sm font-medium text-white">{lightbox.label} · {submission.fullName}</p>
        <AuthenticatedImage fileId={lightbox.id} alt={lightbox.label} className="mx-auto max-h-[75vh] w-auto rounded-lg object-contain" />
        <div className="mt-3 text-center"><button type="button" className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20" onClick={() => setLightbox(null)}>Tutup</button></div>
      </div>
    </div>}
  </div>
}
