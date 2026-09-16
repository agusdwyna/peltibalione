import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { formatAgeGroup } from '../../lib/age-group'
import { useAuthStore } from '../../stores/auth.store'
import { useWorkspaceStore } from '../../stores/workspace.store'
import PortalPagination from '../../components/portal/PortalPagination'
import PortalToolbar from '../../components/portal/PortalToolbar'
import type { Gender, RegistrationForm } from '../../types/portal'

const statusLabel: Record<string, string> = { VERIFIED: 'Terverifikasi', ACTIVE: 'Aktif', INACTIVE: 'Tidak Aktif' }
const statusClass: Record<string, string> = { VERIFIED: 'bg-green-500/15 text-green-700 dark:text-green-400', ACTIVE: 'bg-green-500/15 text-green-700 dark:text-green-400', INACTIVE: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' }
const formStatusLabel: Record<string, string> = { ACTIVE: 'Aktif', CLOSED: 'Ditutup', DRAFT: 'Draf' }
const submitStatusStats: Array<[string, string]> = [['SUBMITTED', 'Menunggu review'], ['CREATED', 'Pemain dibuat'], ['REJECTED', 'Ditolak']]

export default function PlayersPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isAllRegions = useWorkspaceStore((state) => state.isAllRegions)
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.players.list>> | null>(null)
  const [districts, setDistricts] = useState<import('../../types/auth').District[]>([])
  const [districtFilter, setDistrictFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState<Gender | ''>('')
  const [ageGroupFilter, setAgeGroupFilter] = useState('')
  const [ageGroups, setAgeGroups] = useState<import('../../types/portal').AgeGroup[]>([])
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<RegistrationForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [page, setPage] = useState(1)
  const [manageOpen, setManageOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const isCentral = user?.roles.some((role) => role.role === 'CENTRAL_ADMIN') ?? false
  const canManageForm = isCentral || (user?.roles.some((role) => role.role === 'DISTRICT_ADMIN') ?? false)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    api.players.list(token, { page, q: search || undefined, districtId: isAllRegions ? districtFilter || undefined : workspace?.id, gender: genderFilter || undefined, ageGroup: ageGroupFilter || undefined })
      .then(setResult).catch(() => setError('Daftar pemain tidak dapat dimuat.')).finally(() => setLoading(false))
  }, [page, token, workspace?.id, isAllRegions, districtFilter, search, genderFilter, ageGroupFilter])

  useEffect(() => {
    api.ageGroups.list().then(setAgeGroups).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!token) return
    setFormLoading(true)
    api.forms.list(token, { districtId: isAllRegions ? undefined : workspace?.id }).then((items) => setForm(items[0] ?? null)).catch(() => setFormError('Form pendaftaran tidak dapat dimuat.')).finally(() => setFormLoading(false))
  }, [token, workspace?.id, isAllRegions])

  useEffect(() => { if (isAllRegions) api.districts.list().then(setDistricts).catch(() => undefined) }, [isAllRegions])

  const changeFormStatus = async (target: 'ACTIVE' | 'CLOSED') => {
    if (!token || !form) return
    setFormError('')
    try { setForm(await api.forms.setStatus(token, form.id, target)) } catch { setFormError('Status form tidak dapat diubah.') }
  }

  const copyLink = async () => {
    if (!form) return
    await navigator.clipboard?.writeText(`${window.location.origin}/form/player/${form.publicToken}`)
    setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 md:text-3xl">Daftar Pemain</h1><p className="mt-2 text-sm text-gray-500">Kelola data pemain dalam workspace ini.</p></div>
        <div className="flex flex-wrap items-center gap-3">
          {canManageForm && <button className="btn border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" onClick={() => { setFormError(''); setManageOpen(true) }}>Kelola Form</button>}
          <Link className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800" to="/players/new">Tambah Pemain</Link>
        </div>
      </div>
      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
      <section className="rounded-xl bg-white shadow-xs dark:bg-gray-800">
        <PortalToolbar search={{ value: query, onChange: setQuery, onSubmit: () => { setPage(1); setSearch(query.trim()) }, placeholder: 'Cari nama pemain' }} onReset={() => { setPage(1); setDistrictFilter(''); setGenderFilter(''); setAgeGroupFilter(''); setQuery(''); setSearch('') }}>
          {isAllRegions && <select className="form-select sm:max-w-xs" value={districtFilter} onChange={(event) => { setPage(1); setDistrictFilter(event.target.value) }}><option value="">Semua wilayah</option>{districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select>}
          <select className="form-select sm:max-w-xs" value={genderFilter} onChange={(event) => { setPage(1); setGenderFilter(event.target.value as Gender | '') }}><option value="">Semua jenis kelamin</option><option value="PUTRA">Laki-laki</option><option value="PUTRI">Perempuan</option></select>
          <select className="form-select sm:max-w-xs" value={ageGroupFilter} onChange={(event) => { setPage(1); setAgeGroupFilter(event.target.value) }}><option value="">Semua kelompok umur</option>{ageGroups.filter((group) => !genderFilter || !group.gender || group.gender === genderFilter).map((group) => <option key={group.id} value={group.code}>{group.name}</option>)}</select>
        </PortalToolbar>
        {loading ? <p className="p-8 text-sm text-gray-500">Memuat pemain…</p> : !result?.data.length ? <div className="p-10 text-center"><p className="text-sm font-medium text-gray-700 dark:text-gray-200">Belum ada data pemain</p><p className="mt-1 text-sm text-gray-500">Pemain yang sudah diverifikasi di workspace ini akan tampil di sini.</p></div> : <>
          <div className="overflow-x-auto p-3"><table className="w-full table-auto dark:text-gray-300"><thead className="bg-gray-50 text-xs uppercase text-gray-400 dark:bg-gray-700/50 dark:text-gray-500"><tr>{['ID', 'Nama pemain', 'Kelompok umur', 'Kabupaten', 'Status', 'Aksi'].map((heading, index) => <th className="p-2" key={heading}><div className={index === 0 ? 'text-left font-semibold' : 'text-center font-semibold'}>{heading}</div></th>)}</tr></thead><tbody className="divide-y divide-gray-100 text-sm font-medium dark:divide-gray-700/60">{result.data.map((player) => <tr key={player.id}><td className="p-2 font-mono text-xs text-gray-500">{player.playerCode}</td><td className="p-2 text-gray-800 dark:text-gray-100">{player.person.fullName}</td><td className="p-2 text-center text-gray-500">{formatAgeGroup(player.ageGroup, player.person.gender)}</td><td className="p-2 text-center text-gray-500">{player.district.name}</td><td className="p-2 text-center"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[player.status] ?? 'bg-gray-100 text-gray-600'}`}>{statusLabel[player.status] ?? player.status}</span></td><td className="p-2 text-center"><button className="text-sm font-medium text-violet-600 hover:text-violet-700" onClick={() => navigate(`/players/${player.id}`)}>Detail</button></td></tr>)}</tbody></table></div>
          <PortalPagination meta={result.meta} onPageChange={setPage} />
        </>}
      </section>

      {manageOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Kelola form pendaftaran"><div className="absolute inset-0 bg-gray-900/40" onClick={() => setManageOpen(false)} /><div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700/60 dark:bg-gray-800"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-gray-400">Form Pendaftaran Pemain</p><h3 className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100">Kelola Form</h3></div><button className="text-gray-400 hover:text-gray-600" onClick={() => setManageOpen(false)} aria-label="Tutup">×</button></div>
        {formLoading ? <p className="mt-5 text-sm text-gray-500">Memuat form…</p> : form ? <><div className="mt-5 flex items-center justify-between"><div><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{form.title}</p><span className="mt-1 inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">{formStatusLabel[form.status] ?? form.status}</span></div><span className="text-sm text-gray-500">{form._count?.submissions ?? 0} pengajuan</span></div>{form.description && <p className="mt-3 text-sm text-gray-500">{form.description}</p>}<div className="mt-4 grid grid-cols-3 gap-3">{submitStatusStats.map(([key, label]) => <div key={key} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700/60"><p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{form.submissionStats?.[key] ?? 0}</p><p className="mt-1 text-xs text-gray-500">{label}</p></div>)}</div><div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-400 dark:bg-gray-900/40"><span>{form.publicToken}</span><button className="font-sans font-medium text-violet-600" onClick={copyLink}>{copied ? 'Tersalin' : 'Salin Link'}</button></div>{formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}<div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-700/60"><button className="text-sm font-medium text-violet-600" onClick={() => window.open(`/form/player/${form.publicToken}`, '_blank', 'noopener,noreferrer')}>Buka Form</button>{form.status === 'ACTIVE' ? <button className="btn border border-gray-200 bg-white text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" onClick={() => changeFormStatus('CLOSED')}>Tutup Form</button> : <button className="btn bg-gray-900 text-gray-100" onClick={() => changeFormStatus('ACTIVE')}>Publikasikan</button>}</div></> : <><p className="mt-5 text-sm text-gray-500">Form pendaftaran disiapkan otomatis untuk workspace ini.</p>{formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}<div className="mt-6 flex justify-end border-t border-gray-100 pt-5 dark:border-gray-700/60"><button className="btn border border-gray-200 bg-white text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" onClick={() => setManageOpen(false)}>Tutup</button></div></>}
      </div></div>}
    </div>
  )
}
