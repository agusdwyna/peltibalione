import { useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/api'
import { tournamentDraftsToInput, draftsFromTournaments, emptyTournamentDraft, type TournamentDraft } from './TournamentEditor'
import { OFFICIAL_ROLE_OPTIONS, TOURNAMENT_LEVEL_OPTIONS, type OfficialTournament } from '../../types/official'

type Props = {
  tournaments: OfficialTournament[]
  onSave: (input: ReturnType<typeof tournamentDraftsToInput>) => Promise<void>
}

export default function TournamentTable({ tournaments, onSave }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<TournamentDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const open = (item?: OfficialTournament) => {
    setDraft(item ? draftsFromTournaments([item])[0] : emptyTournamentDraft())
    setError('')
    dialog.current?.showModal()
  }
  const close = () => {
    if (saving) return
    dialog.current?.close()
    setDraft(null)
    setError('')
  }
  const patch = (changes: Partial<TournamentDraft>) => setDraft((current) => current ? { ...current, ...changes } : current)
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft || saving) return
    if (!draft.name.trim()) { setError('Nama turnamen wajib diisi.'); return }
    setSaving(true)
    setError('')
    try {
      const current = draftsFromTournaments(tournaments)
      const next = draft.id ? current.map((item) => item.id === draft.id ? draft : item) : [...current, draft]
      await onSave(tournamentDraftsToInput(next))
      dialog.current?.close()
      setDraft(null)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Riwayat turnamen tidak dapat disimpan.')
    } finally { setSaving(false) }
  }
  const remove = async (item: OfficialTournament) => {
    if (saving || !window.confirm(`Hapus turnamen "${item.name}"?`)) return
    setSaving(true)
    setError('')
    try { await onSave(tournamentDraftsToInput(draftsFromTournaments(tournaments.filter((row) => row.id !== item.id)))) }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Riwayat turnamen tidak dapat dihapus.') }
    finally { setSaving(false) }
  }

  return <div>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Riwayat turnamen</h2><p className="mt-1 text-sm text-gray-500">Turnamen yang pernah diikuti wasit. Jumlah turnamen dihitung otomatis.</p></div>
      <div className="flex items-center gap-3"><span className="text-xs text-gray-500">{tournaments.length} catatan</span><button type="button" disabled={saving} onClick={() => open()} className="btn bg-gray-900 text-sm text-gray-100 hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800">Tambah turnamen</button></div>
    </div>
    {error && !draft && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
    <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700/60">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/30 dark:text-gray-400"><tr>{['Nama turnamen', 'Tahun', 'Tingkat', 'Peran', 'Lokasi', 'Aksi'].map((label, index) => <th key={label} className={`px-4 py-3 font-semibold ${index === 5 ? 'text-right' : 'text-left'}`}>{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {tournaments.map((item) => <tr key={item.id}>
            <td className="px-4 py-3.5 font-medium text-gray-800 dark:text-gray-100">{item.name}</td>
            <td className="px-4 py-3.5 text-gray-500">{item.year ?? '—'}</td>
            <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{TOURNAMENT_LEVEL_OPTIONS.find((option) => option.value === item.level)?.label ?? '—'}</td>
            <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{OFFICIAL_ROLE_OPTIONS.find((option) => option.value === item.role)?.label ?? '—'}</td>
            <td className="px-4 py-3.5 text-gray-500">{item.location || '—'}</td>
            <td className="whitespace-nowrap px-4 py-3.5 text-right"><button type="button" disabled={saving} onClick={() => open(item)} className="mr-3 text-sm font-medium text-violet-700 hover:text-violet-800 dark:text-violet-400">Edit</button><button type="button" disabled={saving} onClick={() => void remove(item)} className="text-sm font-medium text-red-700 hover:text-red-800 dark:text-red-400">Hapus</button></td>
          </tr>)}
          {!tournaments.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">Belum ada riwayat turnamen.</td></tr>}
        </tbody>
      </table>
    </div>
    <dialog ref={dialog} aria-labelledby="tournament-dialog-title" onCancel={(event) => { event.preventDefault(); close() }} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-xl bg-white p-0 text-gray-800 shadow-xl backdrop:bg-gray-900/50 dark:bg-gray-800 dark:text-gray-100">
      {draft && <form onSubmit={save} className="space-y-4 p-5">
        <h2 id="tournament-dialog-title" className="text-lg font-semibold">{draft.id ? 'Edit' : 'Tambah'} turnamen</h2>
        <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-1 block text-sm font-medium">Nama turnamen</span><input autoFocus className="form-input w-full" required maxLength={200} value={draft.name} onChange={(event) => patch({ name: event.target.value })} /></label>
          <label><span className="mb-1 block text-sm font-medium">Tahun turnamen</span><input className="form-input w-full" type="number" min={1950} max={new Date().getFullYear() + 1} value={draft.year} onChange={(event) => patch({ year: event.target.value })} /></label>
          <label><span className="mb-1 block text-sm font-medium">Tingkat turnamen</span><select className="form-select w-full" value={draft.level} onChange={(event) => patch({ level: event.target.value as TournamentDraft['level'] })}><option value="">Belum ditentukan</option>{TOURNAMENT_LEVEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className="mb-1 block text-sm font-medium">Peran saat bertugas</span><select className="form-select w-full" value={draft.role} onChange={(event) => patch({ role: event.target.value as TournamentDraft['role'] })}><option value="">Belum ditentukan</option>{OFFICIAL_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className="mb-1 block text-sm font-medium">Lokasi turnamen</span><input className="form-input w-full" maxLength={200} value={draft.location} onChange={(event) => patch({ location: event.target.value })} /></label>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700"><button type="button" disabled={saving} onClick={close} className="btn border border-gray-200 text-sm dark:border-gray-600">Batal</button><button type="submit" disabled={saving} className="btn bg-gray-900 text-sm text-gray-100 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800">{saving ? 'Menyimpan…' : 'Simpan'}</button></div>
      </form>}
    </dialog>
  </div>
}
