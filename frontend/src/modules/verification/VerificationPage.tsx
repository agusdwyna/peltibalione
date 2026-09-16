import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import PortalPagination from '../../components/portal/PortalPagination'
import PortalToolbar from '../../components/portal/PortalToolbar'
import { useWorkspaceStore } from '../../stores/workspace.store'

const duplicateLabel: Record<string, string> = { POSSIBLE_MATCH: 'Kemungkinan duplikat', EXACT_MATCH: 'Duplikat cocok' }
const statusLabel: Record<string, string> = { SUBMITTED: 'Menunggu', UNDER_REVIEW: 'Dalam tinjauan' }

export default function VerificationPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isAllRegions = useWorkspaceStore((state) => state.isAllRegions)
  const [submissions, setSubmissions] = useState<Awaited<ReturnType<typeof api.submissions.list>>['data']>([])
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof api.submissions.list>>['meta'] | null>(null)
  const [page, setPage] = useState(1)
  const [districts, setDistricts] = useState<import('../../types/auth').District[]>([])
  const [districtFilter, setDistrictFilter] = useState('')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState('')
  const canReview = user?.roles.some((role) => role.role === 'DISTRICT_ADMIN' || role.role === 'CENTRAL_ADMIN') ?? false

  const load = () => {
    if (!token) return
    setLoading(true); setError('')
    if (!workspace?.id && !isAllRegions) {
      setSubmissions([])
      setError('Pilih workspace distrik untuk melihat pengajuan.')
      setLoading(false)
      return
    }
    api.submissions.list(token, { page, q: search || undefined, districtId: isAllRegions ? districtFilter || undefined : workspace?.id }).then((r) => { setSubmissions(r.data); setMeta(r.meta) }).catch((reason) => setError(reason instanceof ApiError && reason.code === 'DISTRICT_CONTEXT_REQUIRED' ? 'Pilih workspace distrik untuk melihat pengajuan.' : 'Pengajuan pendaftaran tidak dapat dimuat.')).finally(() => setLoading(false))
  }
  useEffect(load, [token, workspace?.id, isAllRegions, districtFilter, page, search]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (isAllRegions) api.districts.list().then(setDistricts).catch(() => undefined) }, [isAllRegions])

  const review = async (id: string, action: 'LINK' | 'REJECT') => {
    if (!token) return
    setProcessing(id); setError('')
    try {
      await api.submissions.review(token, id, { action, districtId: isAllRegions ? undefined : workspace?.id, rejectionReason: action === 'REJECT' ? 'Ditolak setelah peninjauan admin.' : undefined })
      load()
    } catch { setError('Pengajuan tidak dapat diproses.') } finally { setProcessing('') }
  }

  // Transfers are verification requests, not registrations — different decision endpoint.
  const decideTransfer = async (id: string, decision: 'approve' | 'reject') => {
    if (!token || !window.confirm(decision === 'approve' ? 'Setujui transfer ini? Afiliasi kabupaten pemain akan berpindah.' : 'Tolak permintaan transfer ini?')) return
    setProcessing(id); setError('')
    try {
      await api.verification.decide(token, id, decision, decision === 'reject' ? 'Transfer ditolak setelah peninjauan admin.' : undefined)
      load()
    } catch { setError('Permintaan transfer tidak dapat diproses.') } finally { setProcessing('') }
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 w-full max-w-9xl mx-auto">
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Review Pendaftaran</h1>
          <p className="mt-2 text-sm text-gray-500">Setujui atau tolak pengajuan pemain baru. Yang disetujui langsung menjadi pemain terverifikasi.</p>
        </div>
      </div>

      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}

      <section className="bg-white dark:bg-gray-800 shadow-xs rounded-xl">
        <PortalToolbar search={{ value: query, onChange: setQuery, onSubmit: () => { setPage(1); setSearch(query.trim()) }, placeholder: 'Cari nama pendaftar' }}>{isAllRegions && <select className="form-select sm:max-w-xs" value={districtFilter} onChange={(event) => { setPage(1); setDistrictFilter(event.target.value) }}><option value="">Semua wilayah</option>{districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select>}</PortalToolbar>
        {loading ? <p className="p-8 text-center text-sm text-gray-500">Memuat pengajuan…</p> : submissions.length === 0 ? <div className="p-8 text-center"><p className="text-sm font-medium text-gray-700 dark:text-gray-200">Belum ada pengajuan baru</p><p className="mt-1 text-sm text-gray-500">Pengajuan yang masuk akan tampil di sini untuk ditinjau.</p></div> : <div className="p-3">
          <div className="overflow-x-auto">
            <table className="table-auto w-full dark:text-gray-300">
              <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-xs">
                <tr>
                  <th className="p-2"><div className="font-semibold text-left">Pemain</div></th>
                  <th className="p-2"><div className="font-semibold text-center">NIK</div></th>
                  <th className="p-2"><div className="font-semibold text-center">Kelompok umur</div></th>
                  <th className="p-2"><div className="font-semibold text-center">Kabupaten</div></th>
                  <th className="p-2"><div className="font-semibold text-center">Status</div></th>
                  <th className="p-2"><div className="font-semibold text-center">Aksi</div></th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
                {submissions.map((s) => {
                  const dupe = s.duplicateMatch ? duplicateLabel[s.duplicateMatch] : undefined
                  const isTransfer = s.kind === 'TRANSFER'
                  return <tr key={s.id}>
                    <td className="p-2"><div className="text-left text-gray-800 dark:text-gray-100"><div>{s.fullName}</div>{isTransfer ? <div className="text-xs font-normal text-amber-600 dark:text-amber-500">{s.info}</div> : s.birthPlace && <div className="text-xs font-normal text-gray-400">{s.birthPlace}</div>}</div></td>
                    <td className="p-2"><div className="text-center font-mono text-gray-500">{s.nik ?? '—'}</div></td>
                    <td className="p-2"><div className="text-center text-gray-500">{s.ageGroup ?? '—'}</div></td>
                    <td className="p-2"><div className="text-center text-gray-500">{s.form?.district.name ?? '—'}</div></td>
                    <td className="p-2"><div className="flex justify-center gap-1"><span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700">{isTransfer ? 'Transfer' : statusLabel[s.status] ?? s.status}</span>{dupe && <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-500">{dupe}</span>}</div></td>
                    <td className="p-2"><div className="flex justify-center gap-2">{!isTransfer && <button className="text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-300" onClick={() => navigate(`/verification/${s.id}`)}>Detail</button>}{isTransfer && <span className="text-xs text-gray-400">Tinjau dari detail pemain</span>}{canReview && (isTransfer ? <><button className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50" disabled={processing === s.id} onClick={() => decideTransfer(s.id, 'reject')}>Tolak</button><button className="text-sm font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50" disabled={processing === s.id} onClick={() => decideTransfer(s.id, 'approve')}>{processing === s.id ? 'Memproses…' : 'Setujui'}</button></> : <><button className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50" disabled={processing === s.id} onClick={() => review(s.id, 'REJECT')}>Tolak</button><button className="text-sm font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50" disabled={processing === s.id} onClick={() => review(s.id, 'LINK')}>{processing === s.id ? 'Memproses…' : 'Setujui'}</button></>)}</div></td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
          <PortalPagination meta={meta} onPageChange={setPage} />
        </div>}
      </section>
    </div>
  )
}
