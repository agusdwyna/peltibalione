import InlineSelect from '../../components/portal/InlineSelect'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { useWorkspaceStore } from '../../stores/workspace.store'
import PortalPagination from '../../components/portal/PortalPagination'
import PortalToolbar from '../../components/portal/PortalToolbar'
import ReviewInboxButton from '../../components/portal/ReviewInboxButton'
import { DistrictBreakdown } from '../../components/portal/StatCards'
import type { RegistrationForm } from '../../types/portal'
import {
  ATHLETE_CATEGORY_OPTIONS,
  COACH_STATUS_OPTIONS,
  COACH_VERIFICATION_STATUS_OPTIONS,
  coachStatusClass,
  coachVerificationStatusClass,
  formatExperience,
  type AthleteCategory,
  type CoachStats,
  type CoachStatus,
  type CoachVerificationStatus,
} from '../../types/coach'

const formStatusLabel: Record<string, string> = { ACTIVE: 'Aktif', CLOSED: 'Ditutup', DRAFT: 'Draf' }
const submitStatusStats: Array<[string, string]> = [
  ['SUBMITTED', 'Menunggu review'],
  ['CREATED', 'Pelatih dibuat'],
  ['REJECTED', 'Ditolak'],
]

export default function CoachesPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isAllRegions = useWorkspaceStore((state) => state.isAllRegions)
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.coaches.list>> | null>(null)
  const [stats, setStats] = useState<CoachStats | null>(null)
  const [districts, setDistricts] = useState<import('../../types/auth').District[]>([])
  const [districtFilter, setDistrictFilter] = useState('')
  const [verificationFilter, setVerificationFilter] = useState<CoachVerificationStatus | ''>('')
  const [statusFilter, setStatusFilter] = useState<CoachStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<AthleteCategory | ''>('')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<RegistrationForm | null>(null)
  const [formLoading, setFormLoading] = useState(true)
  const [formError, setFormError] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pendingReview, setPendingReview] = useState<number | null>(null)
  const canManageForm = user?.roles.some((role) => role.role === 'CENTRAL_ADMIN' || role.role === 'DISTRICT_ADMIN') ?? false

  const scopeDistrictId = isAllRegions ? districtFilter || undefined : workspace?.id

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError('')
    api.coaches
      .list(token, {
        page,
        q: search || undefined,
        districtId: scopeDistrictId,
        verificationStatus: verificationFilter || undefined,
        coachStatus: statusFilter || undefined,
        athleteCategory: categoryFilter || undefined,
      })
      .then(setResult)
      .catch(() => setError('Daftar pelatih tidak dapat dimuat.'))
      .finally(() => setLoading(false))
  }, [revision, token, page, search, scopeDistrictId, verificationFilter, statusFilter, categoryFilter])

  // §15 — statistik mengikuti wilayah yang sedang dilihat, bukan hasil filter tabel.
  useEffect(() => {
    if (!token) return
    api.coaches.stats(token, scopeDistrictId).then(setStats).catch(() => setStats(null))
  }, [revision, token, scopeDistrictId])

  // Lencana antrean review. Antrean selalu terikat satu distrik, jadi saat
  // "Semua Wilayah" belum memilih distrik jumlahnya dibiarkan tidak diketahui.
  useEffect(() => {
    if (!token || !scopeDistrictId) {
      setPendingReview(null)
      return
    }
    api.coachSubmissions
      .list(token, { districtId: scopeDistrictId, pageSize: 1 })
      .then((result) => setPendingReview(result.meta.total))
      .catch(() => setPendingReview(null))
  }, [revision, token, scopeDistrictId])

  useEffect(() => {
    if (!token) return
    setFormLoading(true)
    setFormError('')
    api.forms
      .list(token, { districtId: isAllRegions ? undefined : workspace?.id, type: 'COACH_REGISTRATION' })
      .then((items) => setForm(items[0] ?? null))
      .catch(() => setFormError('Form pendataan tidak dapat dimuat.'))
      .finally(() => setFormLoading(false))
  }, [token, workspace?.id, isAllRegions])

  useEffect(() => {
    if (isAllRegions) api.districts.list().then(setDistricts).catch(() => undefined)
  }, [isAllRegions])

  const changeFormStatus = async (target: 'ACTIVE' | 'CLOSED') => {
    if (!token || !form) return
    setFormError('')
    try {
      setForm(await api.forms.setStatus(token, form.id, target))
    } catch {
      setFormError('Status form tidak dapat diubah.')
    }
  }

  const copyLink = async () => {
    if (!form) return
    await navigator.clipboard?.writeText(`${window.location.origin}/form/coach/${form.publicToken}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 md:text-3xl">Master Pelatih</h1>
          <p className="mt-2 text-sm text-gray-500">Data pelatih tenis PELTI Bali di workspace ini.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ReviewInboxButton to="/coaches/review" label="Review Pelatih" count={pendingReview} />
          {canManageForm && (
            <button
              className="btn border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              onClick={() => {
                setFormError('')
                setManageOpen(true)
              }}
            >
              Kelola Form
            </button>
          )}
          <Link className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800" to="/coaches/new">
            Tambah Pelatih
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
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
            placeholder: 'Cari nama / NIK / club melatih',
          }}
          onReset={() => {
            setPage(1)
            setDistrictFilter('')
            setVerificationFilter('')
            setStatusFilter('')
            setCategoryFilter('')
            setQuery('')
            setSearch('')
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
              <option value="">Semua distrik</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          )}
          <select
            className="form-select sm:max-w-xs"
            value={statusFilter}
            onChange={(event) => {
              setPage(1)
              setStatusFilter(event.target.value as CoachStatus | '')
            }}
          >
            <option value="">Semua status</option>
            {COACH_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="form-select sm:max-w-xs"
            value={verificationFilter}
            onChange={(event) => {
              setPage(1)
              setVerificationFilter(event.target.value as CoachVerificationStatus | '')
            }}
          >
            <option value="">Semua verifikasi</option>
            {COACH_VERIFICATION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="form-select sm:max-w-xs"
            value={categoryFilter}
            onChange={(event) => {
              setPage(1)
              setCategoryFilter(event.target.value as AthleteCategory | '')
            }}
          >
            <option value="">Semua kategori atlet</option>
            {ATHLETE_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </PortalToolbar>

        {loading ? (
          <p className="p-8 text-sm text-gray-500">Memuat pelatih…</p>
        ) : !result?.data.length ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Belum ada data pelatih</p>
            <p className="mt-1 text-sm text-gray-500">Pelatih yang sudah disetujui admin akan tampil di sini.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto p-3">
              <table className="w-full table-auto dark:text-gray-300">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400 dark:bg-gray-700/50 dark:text-gray-500">
                  <tr>
                    {['Kode', 'Nama Pelatih', 'Distrik', 'Club', 'Pengalaman', 'Atlet', 'Status', 'Verifikasi', 'Aksi'].map((heading, index) => (
                      <th className="p-2" key={heading}>
                        <div className={index <= 1 ? 'text-left font-semibold' : 'text-center font-semibold'}>{heading}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm font-medium dark:divide-gray-700/60">
                  {result.data.map((coach) => (
                    <tr key={coach.id}>
                      {/* Foto sengaja tidak ditampilkan di daftar — cukup di halaman detail. */}
                      <td className="p-2 font-mono text-xs text-gray-500">{coach.coachCode}</td>
                      <td className="p-2 text-gray-800 dark:text-gray-100">{coach.fullName}</td>
                      <td className="p-2 text-center text-gray-500">{coach.district.name}</td>
                      <td className="p-2 text-center text-gray-500">{coach.clubName || '—'}</td>
                      <td className="p-2 text-center text-gray-500">{formatExperience(coach.coachingSince)}</td>
                      <td className="p-2 text-center text-gray-500">{coach.activeAthletes ?? '—'}</td>
                      <td className="p-2 text-center">
                        <InlineSelect label={`Ubah status aktif ${coach.fullName}`} value={coach.coachStatus} options={COACH_STATUS_OPTIONS} className={coachStatusClass[coach.coachStatus]} disabled={!canManageForm} onSave={async (value) => { if (!token) return; await api.coaches.update(token, coach.id, { coachStatus: value }); setResult((current) => current ? { ...current, data: current.data.map((row) => row.id === coach.id ? { ...row, coachStatus: value as typeof row.coachStatus } : row) } : current); setRevision((value) => value + 1) }} />
                      </td>
                      <td className="p-2 text-center">
                        <InlineSelect label={`Ubah status verifikasi ${coach.fullName}`} value={coach.verificationStatus} options={COACH_VERIFICATION_STATUS_OPTIONS} className={coachVerificationStatusClass[coach.verificationStatus]} disabled={!canManageForm} onSave={async (value) => { if (!token) return; await api.coaches.verify(token, coach.id, { verificationStatus: value as CoachVerificationStatus }); setResult((current) => current ? { ...current, data: current.data.map((row) => row.id === coach.id ? { ...row, verificationStatus: value as typeof row.verificationStatus } : row) } : current); setRevision((value) => value + 1) }} />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          className="text-sm font-medium text-violet-600 hover:text-violet-700"
                          onClick={() => navigate(`/coaches/${coach.id}`)}
                        >
                          Detail
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

      {/* §15 — sebaran per distrik hanya bermakna saat melihat seluruh wilayah. */}
      {stats && <DistrictBreakdown title="Jumlah Pelatih per Distrik" rows={stats.byDistrict} />}

      {manageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Kelola form pendataan pelatih">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setManageOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700/60 dark:bg-gray-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Form Pendataan Pelatih</p>
                <h3 className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100">Kelola Form</h3>
              </div>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setManageOpen(false)} aria-label="Tutup">
                ×
              </button>
            </div>
            {formLoading ? (
              <p className="mt-5 text-sm text-gray-500">Memuat form…</p>
            ) : form ? (
              <>
                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{form.title}</p>
                    <span className="mt-1 inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {formStatusLabel[form.status] ?? form.status}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{form._count?.submissions ?? 0} pengajuan</span>
                </div>
                {form.description && <p className="mt-3 text-sm text-gray-500">{form.description}</p>}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {submitStatusStats.map(([key, label]) => (
                    <div key={key} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700/60">
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{form.submissionStats?.[key] ?? 0}</p>
                      <p className="mt-1 text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-400 dark:bg-gray-900/40">
                  <span>{form.publicToken}</span>
                  <button className="font-sans font-medium text-violet-600" onClick={copyLink}>
                    {copied ? 'Tersalin' : 'Salin Link'}
                  </button>
                </div>
                {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
                <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-700/60">
                  <button
                    className="text-sm font-medium text-violet-600"
                    onClick={() => window.open(`/form/coach/${form.publicToken}`, '_blank', 'noopener,noreferrer')}
                  >
                    Buka Form
                  </button>
                  {form.status === 'ACTIVE' ? (
                    <button
                      className="btn border border-gray-200 bg-white text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                      onClick={() => changeFormStatus('CLOSED')}
                    >
                      Tutup Form
                    </button>
                  ) : (
                    <button className="btn bg-gray-900 text-gray-100" onClick={() => changeFormStatus('ACTIVE')}>
                      Publikasikan
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="mt-5 text-sm text-gray-500">
                  Form pendataan pelatih disiapkan otomatis untuk workspace ini. Pilih satu workspace distrik terlebih dahulu bila belum.
                </p>
                {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
                <div className="mt-6 flex justify-end border-t border-gray-100 pt-5 dark:border-gray-700/60">
                  <button
                    className="btn border border-gray-200 bg-white text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    onClick={() => setManageOpen(false)}
                  >
                    Tutup
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
