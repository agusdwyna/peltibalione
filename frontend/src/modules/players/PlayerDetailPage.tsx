import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { maskNik } from '../../lib/mask-nik'
import { useAuthStore } from '../../stores/auth.store'
import type { PlayerDetail, PnpRanking, TrackRecord } from '../../types/portal'

const statusLabel: Record<string, string> = {
  VERIFIED: 'Terverifikasi',
  ACTIVE: 'Aktif',
  INACTIVE: 'Tidak aktif',
  ARCHIVED: 'Diarsipkan',
}

const statusClass: Record<string, string> = {
  VERIFIED: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400',
  ACTIVE: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400',
  INACTIVE: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-700/40 dark:text-gray-300',
  ARCHIVED: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-700/40 dark:text-gray-300',
}

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'
const fieldClass = 'form-input w-full'
const resultOptions = ['PARTICIPANT', 'CHAMPION_3', 'CHAMPION_2', 'CHAMPION_1'] as const
const resultLabels: Record<string, string> = { PARTICIPANT: 'Peserta', CHAMPION_3: 'Juara 3', CHAMPION_2: 'Juara 2', CHAMPION_1: 'Juara 1' }
const categoryLabels: Record<string, string> = { competition: 'Kompetisi', training: 'Pelatihan', other: 'Lainnya' }

type Tab = 'registration' | 'ranking' | 'records'
type ModalKind = 'ranking' | 'record' | null

type RankingForm = { rank: string; period: string }
type RecordForm = { title: string; eventName: string; eventDate: string; category: string; result: string; description: string; certificateNo: string; certificateFileId: string; certificateFileName: string }
type CertificateForm = { title: string; issuer: string; issuedAt: string; certificateNo: string; notes: string; trackRecordId: string; fileId: string; fileName: string }

const emptyRecord: RecordForm = { title: '', eventName: '', eventDate: '', category: '', result: '', description: '', certificateNo: '', certificateFileId: '', certificateFileName: '' }
const emptyCertificate: CertificateForm = { title: '', issuer: '', issuedAt: '', certificateNo: '', notes: '', trackRecordId: '', fileId: '', fileName: '' }

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

function inputDate(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

function Field({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return <div><dt className={labelClass}>{label}</dt><dd className={`text-sm text-gray-800 dark:text-gray-100 ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd></div>
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center border px-2 py-1 text-xs font-medium ${statusClass[status] ?? statusClass.INACTIVE}`}>{statusLabel[status] ?? status}</span>
}

function EmptyTable({ message, colSpan }: { message: string; colSpan: number }) {
  return <tr><td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">{message}</td></tr>
}

function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label={title}>
    <button className="absolute inset-0 cursor-default bg-gray-950/40" aria-label="Tutup dialog" onClick={onClose} />
    <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <div><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p></div>
        <button className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" onClick={onClose} aria-label="Tutup dialog">Tutup</button>
      </div>
      {children}
    </div>
  </div>
}

export default function PlayerDetailPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const [player, setPlayer] = useState<PlayerDetail | null>(null)
  const [tab, setTab] = useState<Tab>('registration')
  const [modal, setModal] = useState<ModalKind>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [rankingForm, setRankingForm] = useState<RankingForm>({ rank: '', period: new Date().getFullYear().toString() })
  const [recordForm, setRecordForm] = useState<RecordForm>(emptyRecord)

  const rankings = useMemo(() => player?.pnpRankings ?? [], [player?.pnpRankings])
  const records = useMemo(() => player?.trackRecords ?? [], [player?.trackRecords])

  const reload = () => {
    if (!token || !playerId) return
    setLoading(true)
    setError('')
    api.players.get(token, playerId)
      .then(setPlayer)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Detail pemain tidak dapat dimuat.'))
      .finally(() => setLoading(false))
  }

  useEffect(reload, [playerId, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const closeModal = () => { if (!saving) { setModal(null); setEditingId(null); setFormError('') } }

  const openRanking = (item?: PnpRanking) => {
    setEditingId(item?.id ?? null)
    setRankingForm({ rank: item?.rank.toString() ?? '', period: item?.period ?? new Date().getFullYear().toString() })
    setFormError(''); setModal('ranking')
  }

  const openRecord = (item?: TrackRecord) => {
    setEditingId(item?.id ?? null)
    setRecordForm({ title: item?.title ?? '', eventName: item?.eventName ?? '', eventDate: inputDate(item?.eventDate), category: item?.category ?? '', result: item?.result ?? '', description: item?.description ?? '', certificateNo: '', certificateFileId: '', certificateFileName: '' })
    setFormError(''); setModal('record')
  }

  const saveRanking = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !playerId || !rankingForm.rank || Number(rankingForm.rank) < 1) return
    setSaving(true); setFormError('')
    try {
      const input = { rank: Number(rankingForm.rank), period: rankingForm.period.trim() }
      const saved = editingId ? await api.players.updatePnpRanking(token, playerId, editingId, input) : await api.players.addPnpRanking(token, playerId, input)
      setPlayer((current) => current ? { ...current, pnpRankings: editingId ? current.pnpRankings?.map((item) => item.id === editingId ? saved : item) : [saved, ...(current.pnpRankings ?? [])] } : current)
      closeModal()
    } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Peringkat PNP tidak dapat disimpan.') } finally { setSaving(false) }
  }

  const saveRecord = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !playerId || !recordForm.title.trim()) return
    setSaving(true); setFormError('')
    try {
      const input = { title: recordForm.title.trim(), eventName: recordForm.eventName.trim() || undefined, eventDate: recordForm.eventDate || undefined, category: recordForm.category || undefined, result: recordForm.result || undefined, description: recordForm.description.trim() || undefined }
      const saved = editingId ? await api.players.updateTrackRecord(token, playerId, editingId, input) : await api.players.addTrackRecord(token, playerId, input)
      if (!editingId && (recordForm.certificateNo.trim() || recordForm.certificateFileId)) {
        const certificate = await api.players.addCertificate(token, playerId, { title: `Bukti ${saved.title}`, certificateNo: recordForm.certificateNo.trim() || undefined, fileId: recordForm.certificateFileId || undefined, trackRecordId: saved.id })
        setPlayer((current) => current ? { ...current, certificates: [certificate, ...(current.certificates ?? [])] } : current)
      }
      setPlayer((current) => current ? { ...current, trackRecords: editingId ? current.trackRecords?.map((item) => item.id === editingId ? saved : item) : [saved, ...(current.trackRecords ?? [])] } : current)
      closeModal()
    } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Riwayat prestasi tidak dapat disimpan.') } finally { setSaving(false) }
  }

  const remove = async (kind: Exclude<ModalKind, null>, id?: string) => {
    if (!token || !playerId || !id || !window.confirm('Hapus catatan ini? Tindakan ini tidak dapat dibatalkan.')) return
    try {
      if (kind === 'ranking') { await api.players.deletePnpRanking(token, playerId, id); setPlayer((current) => current ? { ...current, pnpRankings: current.pnpRankings?.filter((item) => item.id !== id) } : current) }
      if (kind === 'record') { await api.players.deleteTrackRecord(token, playerId, id); setPlayer((current) => current ? { ...current, trackRecords: current.trackRecords?.filter((item) => item.id !== id), certificates: current.certificates?.map((item) => item.trackRecordId === id ? { ...item, trackRecordId: null } : item) } : current) }
      if (kind === 'certificate') { await api.players.deleteCertificate(token, playerId, id); setPlayer((current) => current ? { ...current, certificates: current.certificates?.filter((item) => item.id !== id) } : current) }
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Catatan tidak dapat dihapus.') }
  }

  if (loading) return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8"><p className="text-sm text-gray-500">Memuat detail pemain...</p></div>
  if (error || !player) return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8"><Link className="text-sm font-medium text-violet-700" to="/players">Kembali ke pemain</Link><div className="mt-8 border border-red-200 bg-red-50 p-5 text-sm text-red-700" role="alert">{error || 'Pemain tidak ditemukan.'}</div></div>

  const tabs: Array<[Tab, string]> = [['registration', 'Registrasi olahraga'], ['ranking', 'Peringkat PNP'], ['records', 'Riwayat prestasi']]
  return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-6 flex items-center justify-between gap-4"><Link className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" to="/players">Kembali ke daftar pemain</Link><button className="btn border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" onClick={() => navigate('/players')}>Daftar pemain</button></div>
    {error && <div className="mb-5 border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
    <div className="grid gap-6 lg:grid-cols-[minmax(220px,20%)_minmax(0,80%)]">
      <aside className="h-fit rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700/60 dark:bg-gray-800">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xl font-semibold text-gray-400 dark:bg-gray-700">{player.person.fullName.slice(0, 1).toUpperCase()}</div>
        <h1 className="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">{player.person.fullName}</h1><p className="mt-1 font-mono text-xs text-gray-500">{player.playerCode}</p><div className="mt-4"><StatusBadge status={player.status} /></div>
        <dl className="mt-7 space-y-5"><Field label="Kabupaten / kota" value={player.district.name} /><Field label="Kelompok umur" value={player.ageGroup} /><Field label="Klub" value={player.club?.name} /><Field label="NIK" value={player.person.nik ? maskNik(player.person.nik) : null} mono /><Field label="Tempat lahir" value={player.person.birthPlace} /><Field label="Tanggal lahir" value={formatDate(player.person.birthDate)} /><Field label="Telepon" value={player.person.phone} /><Field label="Alamat" value={player.person.address} /></dl>
      </aside>
      <section className="min-w-0 rounded-lg border border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800">
        <nav className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700/60" aria-label="Detail pemain">{tabs.map(([key, label]) => <button key={key} className={`whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-semibold transition sm:px-5 ${tab === key ? 'border-violet-500 text-violet-700 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`} onClick={() => setTab(key)}>{label}</button>)}</nav>
        <div className="p-5 sm:p-7">
          {tab === 'registration' && <div><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Registrasi olahraga</h2><p className="mt-1 text-sm text-gray-500">Informasi registrasi olahraga pemain saat ini.</p><dl className="mt-7 grid gap-6 border-t border-gray-100 pt-6 sm:grid-cols-2 dark:border-gray-700/60"><Field label="Kabupaten / kota" value={player.district.name} /><Field label="Kelompok umur" value={player.ageGroup} /><Field label="Klub" value={player.club?.name} /><Field label="Kode pemain" value={player.playerCode} mono /></dl></div>}
          {tab === 'ranking' && <div><TabHeader title="Peringkat PNP" description="Riwayat peringkat pemain berdasarkan periode pencatatan." count={rankings.length} actionLabel="Tambah peringkat" onAdd={() => openRanking()} /><TableFrame><table className="w-full min-w-[560px] text-left text-sm"><TableHead labels={['Peringkat', 'Periode', 'Terakhir diperbarui', 'Aksi']} /><tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">{rankings.map((item) => <tr key={item.id ?? `${item.period}-${item.rank}`}><td className="px-4 py-3.5 font-semibold text-gray-800 dark:text-gray-100">#{item.rank}</td><td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{item.period}</td><td className="px-4 py-3.5 text-gray-500">{formatDate(item.updatedAt)}</td><RowActions onEdit={() => openRanking(item)} onDelete={() => remove('ranking', item.id)} /></tr>)}{!rankings.length && <EmptyTable message="Belum ada riwayat peringkat." colSpan={4} />}</tbody></table></TableFrame></div>}
          {tab === 'records' && <div><TabHeader title="Riwayat prestasi" description="Prestasi, kompetisi, dan kegiatan pembinaan yang pernah diikuti pemain." count={records.length} actionLabel="Tambah prestasi" onAdd={() => openRecord()} /><TableFrame><table className="w-full min-w-[720px] text-left text-sm"><TableHead labels={['Prestasi / kegiatan', 'Kategori', 'Capaian', 'Tanggal', 'Bukti sertifikat', 'Aksi']} /><tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">{records.map((item) => <tr key={item.id ?? item.title}><td className="px-4 py-3.5"><p className="font-medium text-gray-800 dark:text-gray-100">{item.title}</p>{item.eventName && <p className="mt-0.5 text-xs text-gray-500">{item.eventName}</p>}</td><td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{categoryLabels[item.category ?? ''] ?? item.category ?? '—'}</td><td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{resultLabels[item.result ?? ''] ?? item.result ?? '—'}</td><td className="px-4 py-3.5 text-gray-500">{formatDate(item.eventDate)}</td><td className="px-4 py-3.5 text-gray-500">{(player.certificates ?? []).filter((certificate) => certificate.trackRecordId === item.id).length || '—'}</td><RowActions onEdit={() => openRecord(item)} onDelete={() => remove('record', item.id)} /></tr>)}{!records.length && <EmptyTable message="Belum ada riwayat prestasi." colSpan={6} />}</tbody></table></TableFrame></div>}
                  </div>
      </section>
    </div>

    {modal === 'ranking' && <Modal title={editingId ? 'Edit peringkat PNP' : 'Tambah peringkat PNP'} description="Simpan posisi peringkat beserta periode pencatatannya." onClose={closeModal}><form className="space-y-4 p-5" onSubmit={saveRanking}><div className="grid gap-4 sm:grid-cols-2"><label><span className={labelClass}>Peringkat</span><input className={fieldClass} type="number" min="1" value={rankingForm.rank} onChange={(event) => setRankingForm({ ...rankingForm, rank: event.target.value })} required /></label><label><span className={labelClass}>Periode</span><input className={fieldClass} value={rankingForm.period} onChange={(event) => setRankingForm({ ...rankingForm, period: event.target.value })} required /></label></div><ModalFooter saving={saving} onClose={closeModal} label={editingId ? 'Simpan perubahan' : 'Tambah peringkat'} error={formError} /></form></Modal>}
    {modal === 'record' && <Modal title={editingId ? 'Edit riwayat prestasi' : 'Tambah riwayat prestasi'} description="Catat kompetisi, pelatihan, atau kegiatan pembinaan pemain." onClose={closeModal}><form className="space-y-4 p-5" onSubmit={saveRecord}><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className={labelClass}>Nama prestasi / kegiatan</span><input className={fieldClass} value={recordForm.title} onChange={(event) => setRecordForm({ ...recordForm, title: event.target.value })} required /></label><label><span className={labelClass}>Nama event</span><input className={fieldClass} value={recordForm.eventName} onChange={(event) => setRecordForm({ ...recordForm, eventName: event.target.value })} /></label><label><span className={labelClass}>Tanggal</span><input className={fieldClass} type="date" value={recordForm.eventDate} onChange={(event) => setRecordForm({ ...recordForm, eventDate: event.target.value })} /></label><label><span className={labelClass}>Kategori</span><select className="form-select w-full" value={recordForm.category} onChange={(event) => setRecordForm({ ...recordForm, category: event.target.value })}><option value="">Pilih kategori</option><option value="competition">Kompetisi</option><option value="training">Pelatihan</option><option value="other">Lainnya</option></select></label><label><span className={labelClass}>Capaian</span><select className="form-select w-full" value={recordForm.result} onChange={(event) => setRecordForm({ ...recordForm, result: event.target.value })}><option value="">Pilih capaian</option>{resultOptions.map((option) => <option key={option} value={option}>{resultLabels[option]}</option>)}</select></label><label className="sm:col-span-2"><span className={labelClass}>Keterangan</span><textarea className="form-textarea w-full" rows={3} value={recordForm.description} onChange={(event) => setRecordForm({ ...recordForm, description: event.target.value })} /></label><div className="sm:col-span-2 border-t border-gray-100 pt-4 dark:border-gray-700/60"><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Bukti sertifikat (opsional)</p><p className="mt-1 text-xs text-gray-500">Bukti tersimpan langsung bersama prestasi ini. Gambar atau kredensial boleh diisi.</p></div><label><span className={labelClass}>Kredensial / nomor</span><input className={fieldClass} value={recordForm.certificateNo} onChange={(event) => setRecordForm({ ...recordForm, certificateNo: event.target.value })} /></label><label><span className={labelClass}>Gambar sertifikat</span><input className="block w-full text-sm text-gray-500" type="file" accept="image/jpeg,image/png" onChange={async (event) => { const file = event.target.files?.[0]; if (!file || !token) return; try { const uploaded = await api.players.uploadCertificateFile(token, file); setRecordForm((current) => ({ ...current, certificateFileId: uploaded.id, certificateFileName: uploaded.originalName })) } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Gambar sertifikat tidak dapat diunggah.') } }} /><span className="mt-1 block text-xs text-gray-500">{recordForm.certificateFileName || 'Tidak ada gambar dipilih'}</span></label></div><ModalFooter saving={saving} onClose={closeModal} label={editingId ? 'Simpan perubahan' : 'Tambah prestasi'} error={formError} /></form></Modal>}
  </div>
}

function TabHeader({ title, description, count, actionLabel, onAdd }: { title: string; description: string; count: number; actionLabel: string; onAdd: () => void }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2><p className="mt-1 text-sm text-gray-500">{description}</p></div><div className="flex items-center gap-3"><span className="text-xs text-gray-500">{count} catatan</span><button className="btn bg-gray-900 text-sm text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800" onClick={onAdd}>{actionLabel}</button></div></div>
}

function TableHead({ labels }: { labels: string[] }) {
  return <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/30 dark:text-gray-400"><tr>{labels.map((label, index) => <th key={label} className={`px-4 py-3 font-semibold ${index === labels.length - 1 ? 'text-right' : 'text-left'}`}>{label}</th>)}</tr></thead>
}

function TableFrame({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700/60">{children}</div>
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <td className="whitespace-nowrap px-4 py-3.5 text-right"><button className="mr-3 text-sm font-medium text-violet-700 hover:text-violet-800 dark:text-violet-400" onClick={onEdit}>Edit</button><button className="text-sm font-medium text-red-700 hover:text-red-800 dark:text-red-400" onClick={onDelete}>Delete</button></td>
}

function ModalFooter({ saving, onClose, label, error }: { saving: boolean; onClose: () => void; label: string; error: string }) {
  return <div className="border-t border-gray-200 pt-4 dark:border-gray-700"><div className="flex flex-wrap items-center justify-between gap-3">{error ? <p className="text-sm text-red-600" role="alert">{error}</p> : <span /> }<div className="flex gap-3"><button type="button" className="btn border border-gray-200 bg-white text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" onClick={onClose} disabled={saving}>Batal</button><button type="submit" className="btn bg-gray-900 text-sm text-gray-100 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800" disabled={saving}>{saving ? 'Menyimpan...' : label}</button></div></div></div>
}
