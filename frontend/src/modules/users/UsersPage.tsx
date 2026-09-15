import { FormEvent, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { useWorkspaceStore } from '../../stores/workspace.store'
import type { District } from '../../types/auth'
import type { ManagedUser, SystemRole, UserRoleInput } from '../../types/system'
import PortalPagination from '../../components/portal/PortalPagination'
import PortalToolbar from '../../components/portal/PortalToolbar'

const roleLabels: Record<SystemRole, string> = {
  CENTRAL_ADMIN: 'Admin Pusat',
  DISTRICT_ADMIN: 'Admin Wilayah',
  PLAYER: 'Pemain',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

function roleSummary(user: ManagedUser) {
  return user.userRoles.map((assignment) => {
    const district = assignment.district?.name ? ` · ${assignment.district.name}` : ''
    return `${roleLabels[assignment.role]}${district}`
  }).join(', ')
}

type UserForm = {
  name: string
  email: string
  password: string
  role: SystemRole
  districtId: string
}

const emptyForm: UserForm = { name: '', email: '', password: '', role: 'DISTRICT_ADMIN', districtId: '' }

export default function UsersPage() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isAllRegions = useWorkspaceStore((state) => state.isAllRegions)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof api.users.list>>['meta'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const canManageUsers = user?.roles.some((role) => role.role === 'CENTRAL_ADMIN') ?? false
  const [districtFilter, setDistrictFilter] = useState('')

  const load = () => {
    if (!token) return
    setLoading(true)
    setError('')
    api.users.list(token, { page, q: search, districtId: isAllRegions ? districtFilter || undefined : workspace?.id }).then((result) => {
      setUsers(result.data)
      setMeta(result.meta)
    }).catch(() => setError('Daftar pengguna tidak dapat dimuat.')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token, page, search, isAllRegions, districtFilter, workspace?.id])
  useEffect(() => { api.districts.list().then(setDistricts).catch(() => undefined) }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setDialogOpen(true)
  }

  const openEdit = (user: ManagedUser) => {
    const assignment = user.userRoles[0]
    setEditing(user)
    setForm({ name: user.name, email: user.email, password: '', role: assignment?.role ?? 'DISTRICT_ADMIN', districtId: assignment?.districtId ?? '' })
    setFormError('')
    setDialogOpen(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    setSaving(true)
    setFormError('')
    const roles: UserRoleInput[] = [{ role: form.role, districtId: form.role === 'DISTRICT_ADMIN' ? form.districtId || null : null }]
    try {
      if (editing) {
        await api.users.update(token, editing.id, { name: form.name, email: form.email, ...(form.password ? { password: form.password } : {}), roles })
      } else {
        await api.users.create(token, { name: form.name, email: form.email, password: form.password, roles })
      }
      setEditing(null)
      setDialogOpen(false)
      setForm(emptyForm)
      load()
    } catch (submissionError) {
      setFormError(submissionError instanceof Error ? submissionError.message : 'Perubahan pengguna tidak dapat disimpan.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActivation = async (user: ManagedUser) => {
    if (!token) return
    try {
      const updated = await api.users.setActivation(token, user.id, !user.isActive)
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : 'Status pengguna tidak dapat diubah.')
    }
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 w-full max-w-9xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Sistem</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-100">Pengguna</h1>
          <p className="mt-2 text-sm text-gray-500">Kelola akun dan hak akses administrator PELTI Bali One.</p>
        </div>
        {canManageUsers && <button className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900" onClick={openCreate}>Tambah pengguna</button>}
      </div>

      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}

      <section className="bg-white dark:bg-gray-800 shadow-xs rounded-xl">
        <PortalToolbar search={{ value: query, onChange: setQuery, onSubmit: () => { setPage(1); setSearch(query.trim()) }, placeholder: 'Cari nama atau email' }}>{isAllRegions && <select className="form-select sm:max-w-xs" value={districtFilter} onChange={(event) => { setPage(1); setDistrictFilter(event.target.value) }}><option value="">Semua wilayah</option>{districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select>}</PortalToolbar>
        {loading ? <p className="p-8 text-sm text-gray-500">Memuat pengguna…</p> : users.length === 0 ? <div className="p-10 text-center"><p className="text-sm font-medium text-gray-700 dark:text-gray-200">Tidak ada pengguna</p><p className="mt-1 text-sm text-gray-500">Coba ubah pencarian atau tambahkan pengguna baru.</p></div> : <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] table-auto text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400 dark:bg-gray-700/40 dark:text-gray-500"><tr><th className="px-4 py-3 font-semibold">Pengguna</th><th className="px-4 py-3 font-semibold">Peran</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Terdaftar</th><th className="px-4 py-3 text-right font-semibold">Aksi</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">{users.map((user) => <tr key={user.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20"><td className="px-4 py-3"><p className="font-medium text-gray-800 dark:text-gray-100">{user.name}</p><p className="mt-0.5 text-xs text-gray-500">{user.email}</p></td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{roleSummary(user)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${user.isActive ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}>{user.isActive ? 'Aktif' : 'Nonaktif'}</span></td><td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td><td className="px-4 py-3 text-right"><div className="inline-flex items-center gap-3">{canManageUsers && <><button className="font-medium text-violet-700 hover:text-violet-800 dark:text-violet-400" onClick={() => openEdit(user)}>Ubah</button><button className="font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" onClick={() => toggleActivation(user)}>{user.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button></>}</div></td></tr>)}</tbody>
            </table>
          </div>
          <PortalPagination meta={meta} onPageChange={setPage} />
        </>}
      </section>

      {dialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title"><button className="absolute inset-0 cursor-default bg-gray-900/40" aria-label="Tutup dialog" onClick={() => { setEditing(null); setDialogOpen(false) }} /><form className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700/60 dark:bg-gray-800" onSubmit={submit}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Akses sistem</p><h2 id="user-dialog-title" className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100">{editing ? 'Ubah pengguna' : 'Tambah pengguna'}</h2></div><button type="button" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" onClick={() => { setEditing(null); setDialogOpen(false) }} aria-label="Tutup">×</button></div><div className="mt-5 grid gap-4"><div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="user-name">Nama</label><input id="user-name" className="form-input w-full" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div><div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="user-email">Email</label><input id="user-email" type="email" className="form-input w-full" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div><div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="user-password">Kata sandi {editing && <span className="font-normal text-gray-400">(kosongkan jika tidak diubah)</span>}</label><input id="user-password" type="password" minLength={8} className="form-input w-full" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!editing} /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="user-role">Peran</label><select id="user-role" className="form-select w-full" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as SystemRole })}><option value="CENTRAL_ADMIN">Admin Pusat</option><option value="DISTRICT_ADMIN">Admin Wilayah</option><option value="PLAYER">Pemain</option></select></div><div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="user-district">Wilayah</label><select id="user-district" className="form-select w-full" value={form.districtId} disabled={form.role !== 'DISTRICT_ADMIN'} onChange={(event) => setForm({ ...form, districtId: event.target.value })}><option value="">Pilih wilayah</option>{districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select></div></div></div>{formError && <p className="mt-4 text-sm text-red-600" role="alert">{formError}</p>}<div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-700/60"><button type="button" className="btn border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" onClick={() => { setEditing(null); setDialogOpen(false) }}>Batal</button><button className="btn bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan pengguna'}</button></div></form></div>}
    </div>
  )
}
