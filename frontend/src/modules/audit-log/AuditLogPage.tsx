import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { useWorkspaceStore } from '../../stores/workspace.store'
import type { District } from '../../types/auth'
import type { AuditLog } from '../../types/system'
import PortalPagination from '../../components/portal/PortalPagination'
import PortalToolbar from '../../components/portal/PortalToolbar'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function readableAction(action: string) {
  return action.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}

function valuePreview(value: unknown) {
  if (value === null || value === undefined) return '—'
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

export default function AuditLogPage() {
  const token = useAuthStore((state) => state.token)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isAllRegions = useWorkspaceStore((state) => state.isAllRegions)
  const [districts, setDistricts] = useState<District[]>([])
  const [districtFilter, setDistrictFilter] = useState('')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof api.audit.list>>['meta'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  useEffect(() => { if (isAllRegions) api.districts.list().then(setDistricts).catch(() => undefined) }, [isAllRegions])
  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError('')
    api.audit.list(token, { page, action: action || undefined, entityType: entityType || undefined, districtId: isAllRegions ? districtFilter || undefined : workspace?.id }).then((result) => {
      setLogs(result.data)
      setMeta(result.meta)
    }).catch(() => setError('Log audit tidak dapat dimuat.')).finally(() => setLoading(false))
  }, [token, page, action, entityType, districtFilter, isAllRegions, workspace?.id])

  const applyFilter = (setter: (value: string) => void, value: string) => {
    setPage(1)
    setter(value)
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 w-full max-w-9xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Sistem</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-100">Log Audit</h1>
        <p className="mt-2 text-sm text-gray-500">Jejak perubahan dan aktivitas penting di seluruh sistem.</p>
      </div>

      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}

      <section className="bg-white dark:bg-gray-800 shadow-xs rounded-xl">
        <PortalToolbar onReset={() => { setPage(1); setAction(''); setEntityType(''); setDistrictFilter('') }}><select id="audit-action" className="form-select sm:max-w-xs" value={action} onChange={(event) => applyFilter(setAction, event.target.value)}><option value="">Semua aksi</option><option value="CREATE_ADMIN">Buat admin</option><option value="UPDATE_USER">Ubah pengguna</option><option value="ENABLE_ADMIN">Aktifkan admin</option><option value="DISABLE_ADMIN">Nonaktifkan admin</option><option value="CREATE_PLAYER">Buat pemain</option><option value="APPROVE">Setujui</option><option value="REJECT">Tolak</option></select>{isAllRegions && <select className="form-select sm:max-w-xs" value={districtFilter} onChange={(event) => applyFilter(setDistrictFilter, event.target.value)}><option value="">Semua wilayah</option>{districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select>}<select id="audit-entity" className="form-select sm:max-w-xs" value={entityType} onChange={(event) => applyFilter(setEntityType, event.target.value)}><option value="">Semua entitas</option><option value="USER">Pengguna</option><option value="PLAYER">Pemain</option><option value="SUBMISSION">Pengajuan</option><option value="FORM">Form</option><option value="VERIFICATION">Verifikasi</option></select></PortalToolbar>
        {loading ? <p className="p-8 text-sm text-gray-500">Memuat log audit…</p> : logs.length === 0 ? <div className="p-10 text-center"><p className="text-sm font-medium text-gray-700 dark:text-gray-200">Belum ada aktivitas yang cocok</p><p className="mt-1 text-sm text-gray-500">Ubah filter untuk melihat catatan lainnya.</p></div> : <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] table-auto text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400 dark:bg-gray-700/40 dark:text-gray-500"><tr><th className="px-4 py-3 font-semibold">Waktu</th><th className="px-4 py-3 font-semibold">Aktor</th><th className="px-4 py-3 font-semibold">Aktivitas</th><th className="px-4 py-3 font-semibold">Entitas</th><th className="px-4 py-3 font-semibold">Perubahan</th><th className="px-4 py-3 text-right font-semibold">Detail</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">{logs.map((log) => <tr key={log.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20"><td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(log.timestamp)}</td><td className="px-4 py-3"><p className="font-medium text-gray-800 dark:text-gray-100">{log.actor.name}</p><p className="mt-0.5 text-xs text-gray-500">{log.actor.email}</p></td><td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">{readableAction(log.action)}</td><td className="px-4 py-3"><span className="text-gray-600 dark:text-gray-300">{log.entityType}</span><p className="mt-0.5 font-mono text-xs text-gray-400">{log.entityId}</p></td><td className="max-w-xs px-4 py-3 text-xs text-gray-500">{valuePreview(log.newValue)}</td><td className="px-4 py-3 text-right"><button className="font-medium text-violet-700 hover:text-violet-800 dark:text-violet-400" onClick={() => setSelected(log)}>Lihat</button></td></tr>)}</tbody>
            </table>
          </div>
          <PortalPagination meta={meta} onPageChange={setPage} />
        </>}
      </section>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title"><button className="absolute inset-0 cursor-default bg-gray-900/40" aria-label="Tutup detail" onClick={() => setSelected(null)} /><div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700/60 dark:bg-gray-800"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Detail aktivitas</p><h2 id="audit-detail-title" className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100">{readableAction(selected.action)}</h2><p className="mt-1 text-sm text-gray-500">{formatDate(selected.timestamp)} oleh {selected.actor.name}</p></div><button className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" onClick={() => setSelected(null)} aria-label="Tutup">×</button></div><dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-wide text-gray-400">Entitas</dt><dd className="mt-1 text-gray-700 dark:text-gray-200">{selected.entityType}</dd></div><div><dt className="text-xs uppercase tracking-wide text-gray-400">ID entitas</dt><dd className="mt-1 break-all font-mono text-xs text-gray-600 dark:text-gray-300">{selected.entityId}</dd></div></dl><div className="mt-6 grid gap-4 sm:grid-cols-2"><div><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sebelum</h3><pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">{selected.oldValue ? JSON.stringify(selected.oldValue, null, 2) : '—'}</pre></div><div><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sesudah</h3><pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">{selected.newValue ? JSON.stringify(selected.newValue, null, 2) : '—'}</pre></div></div></div></div>}
    </div>
  )
}
