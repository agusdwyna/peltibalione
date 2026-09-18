import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { useWorkspaceStore } from '../../stores/workspace.store'
import PortalPagination from '../../components/portal/PortalPagination'
import PortalToolbar from '../../components/portal/PortalToolbar'
import { coachStatusLabel, formatExperience } from '../../types/coach'

const statusLabel: Record<string, string> = { SUBMITTED: 'Menunggu', UNDER_REVIEW: 'Dalam tinjauan' }

export default function CoachReviewPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isAllRegions = useWorkspaceStore((state) => state.isAllRegions)
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.coachSubmissions.list>> | null>(null)
  const [districts, setDistricts] = useState<import('../../types/auth').District[]>([])
  const [districtFilter, setDistrictFilter] = useState('')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Antrean review selalu terikat satu distrik — "Semua Wilayah" harus memilih dulu.
  const scopeDistrictId = isAllRegions ? districtFilter || undefined : workspace?.id

  useEffect(() => {
    if (!token) return
    if (!scopeDistrictId) {
      setResult(null)
      setError('Pilih satu workspace distrik untuk melihat antrean pengajuan pelatih.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    api.coachSubmissions
      .list(token, { page, q: search || undefined, districtId: scopeDistrictId })
      .then(setResult)
      .catch((reason) =>
        setError(
          reason instanceof ApiError && reason.code === 'DISTRICT_CONTEXT_REQUIRED'
            ? 'Pilih satu workspace distrik untuk melihat antrean pengajuan pelatih.'
            : 'Pengajuan pelatih tidak dapat dimuat.',
        ),
      )
      .finally(() => setLoading(false))
  }, [token, page, search, scopeDistrictId])

  useEffect(() => {
    if (isAllRegions) api.districts.list().then(setDistricts).catch(() => undefined)
  }, [isAllRegions])

  return (
    <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" to="/coaches">
          ← Kembali ke daftar pelatih
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 md:text-3xl">Review Pelatih</h1>
        <p className="mt-2 text-sm text-gray-500">
          Tinjau pengajuan pendataan pelatih, lalu setujui dengan status verifikasi, atau tolak dengan catatan.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
          {error}
        </div>
      )}

      <section className="rounded-xl bg-white shadow-xs dark:bg-gray-800">
        <PortalToolbar
          search={{
            value: query,
            onChange: setQuery,
            onSubmit: () => {
              setPage(1)
              setSearch(query.trim())
            },
            placeholder: 'Cari nama / NIK / club',
          }}
        >
          {isAllRegions && (
            <select
              className="form-select sm:max-w-xs"
              value={districtFilter}
              onChange={(event) => {
                setPage(1)
                setDistrictFilter(event.target.value)
              }}
            >
              <option value="">Pilih distrik</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          )}
        </PortalToolbar>

        {loading ? (
          <p className="p-8 text-center text-sm text-gray-500">Memuat pengajuan…</p>
        ) : !result?.data.length ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Belum ada pengajuan pelatih</p>
            <p className="mt-1 text-sm text-gray-500">Pengajuan yang masuk lewat form publik akan tampil di sini.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto p-3">
              <table className="w-full table-auto dark:text-gray-300">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400 dark:bg-gray-700/50 dark:text-gray-500">
                  <tr>
                    {['Pelatih', 'Club', 'Pengalaman', 'Sertifikat', 'Distrik', 'Status', 'Aksi'].map((heading, index) => (
                      <th className="p-2" key={heading}>
                        <div className={index === 0 ? 'text-left font-semibold' : 'text-center font-semibold'}>{heading}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm font-medium dark:divide-gray-700/60">
                  {result.data.map((submission) => (
                    <tr key={submission.id}>
                      {/* Foto sengaja tidak ditampilkan di antrean — cukup saat ditinjau. */}
                      <td className="p-2">
                        <div className="min-w-0">
                          <div className="truncate text-gray-800 dark:text-gray-100">{submission.fullName}</div>
                          <div className="truncate font-mono text-xs font-normal text-gray-400">{submission.nik}</div>
                        </div>
                      </td>
                      <td className="p-2 text-center text-gray-500">{submission.clubName || '—'}</td>
                      <td className="p-2 text-center text-gray-500">{formatExperience(submission.coachingSince)}</td>
                      <td className="p-2 text-center text-gray-500">{submission._count?.certificates ?? 0}</td>
                      <td className="p-2 text-center text-gray-500">{submission.form?.district.name ?? '—'}</td>
                      <td className="p-2 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700">
                            {statusLabel[submission.status] ?? submission.status}
                          </span>
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {coachStatusLabel(submission.coachStatus)}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          className="text-sm font-medium text-violet-600 hover:text-violet-700"
                          onClick={() => navigate(`/coaches/review/${submission.id}`)}
                        >
                          Tinjau
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PortalPagination meta={result.meta} onPageChange={setPage} />
          </>
        )}
      </section>
    </div>
  )
}
