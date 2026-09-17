import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { formatAgeGroup } from '../../lib/age-group'
import AuthenticatedImage from '../../components/ui/AuthenticatedImage'
import { useAuthStore } from '../../stores/auth.store'
import type { PlayerDetail, PnpRanking, TrackRecord } from '../../types/portal'

const statusLabel: Record<string, string> = {
  VERIFIED: 'Terverifikasi',
  ACTIVE: 'Aktif',
  INACTIVE: 'Tidak aktif',
  ARCHIVED: 'Diarsipkan',
}

const statusClass: Record<string, string> = {
  VERIFIED: 'bg-green-500/15 text-green-700 dark:text-green-400',
  ACTIVE: 'bg-green-500/15 text-green-700 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  ARCHIVED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'
const fieldClass = 'form-input w-full'
const resultOptions = ['PARTICIPANT', 'CHAMPION_3', 'CHAMPION_2', 'CHAMPION_1'] as const
const resultLabels: Record<string, string> = { PARTICIPANT: 'Peserta', CHAMPION_3: 'Juara 3', CHAMPION_2: 'Juara 2', CHAMPION_1: 'Juara 1' }
const categoryLabels: Record<string, string> = { competition: 'Kompetisi', training: 'Pelatihan', other: 'Lainnya' }

type Tab = 'profile' | 'ranking' | 'records'
type ModalKind = 'ranking' | 'record' | 'transfer' | null
type RemoveKind = 'ranking' | 'record' | 'certificate'

type PersonalForm = {
  fullName: string
  nik: string
  gender: '' | 'PUTRA' | 'PUTRI'
  birthPlace: string
  birthDate: string
  address: string
  phone: string
  instagram: string
  whatsapp: string
}

type RankingForm = { rank: string; period: string }
type RecordForm = { title: string; eventDate: string; category: string; result: string; description: string; certificateNo: string; certificateFileId: string; certificateFileName: string }
type CertificateForm = { title: string; issuer: string; issuedAt: string; certificateNo: string; notes: string; trackRecordId: string; fileId: string; fileName: string }

const emptyRecord: RecordForm = { title: '', eventDate: '', category: '', result: '', description: '', certificateNo: '', certificateFileId: '', certificateFileName: '' }
const emptyCertificate: CertificateForm = { title: '', issuer: '', issuedAt: '', certificateNo: '', notes: '', trackRecordId: '', fileId: '', fileName: '' }

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

function inputDate(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

/** Umur dihitung otomatis dari tanggal lahir, sama seperti master pelatih & wasit. */
function ageFrom(birthDate?: string | null) {
  if (!birthDate) return null
  const born = new Date(birthDate)
  if (Number.isNaN(born.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const monthDiff = today.getMonth() - born.getMonth()
  // Ulang tahun tahun ini belum lewat — kurangi satu.
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age -= 1
  return age < 0 ? null : age
}

function personalFormFromPlayer(player: PlayerDetail): PersonalForm {
  return {
    fullName: player.fullName,
    nik: player.nik ?? '',
    gender: (player.gender ?? '') as PersonalForm['gender'],
    birthPlace: player.birthPlace ?? '',
    birthDate: inputDate(player.birthDate),
    address: player.address ?? '',
    phone: player.phone ?? '',
    instagram: player.instagram ?? '',
    whatsapp: player.whatsapp ?? '',
  }
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: { title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])
  return <div className="fixed inset-0 z-60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
    <button className="absolute inset-0 cursor-default bg-gray-950/50" aria-label="Tutup dialog" onClick={onCancel} />
    <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{message}</p>
      <div className="mt-6 flex justify-end gap-3"><button type="button" className="btn border border-gray-200 bg-white text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" onClick={onCancel}>Batal</button><button type="button" className="btn bg-gray-900 text-sm text-gray-100 dark:bg-gray-100 dark:text-gray-800" onClick={onConfirm}>{confirmLabel}</button></div>
    </div>
  </div>
}

/** Satu baris label–nilai pada ringkasan profil di kepala halaman. */
function HeroField({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  const empty = !value
  return <div>
    <dt className="text-xs font-medium text-gray-500">{label}</dt>
    <dd className={`mt-1 text-sm ${mono ? 'font-mono ' : ''}${empty ? 'text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>{value || '—'}</dd>
  </div>
}

function PersonalRow({ label, value, hint, mono = false, children }: { label: string; value?: string; hint?: string; mono?: boolean; children?: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:gap-6"><dt className="shrink-0 text-sm font-medium text-gray-500 sm:w-48">{label}</dt><dd className={`min-w-0 flex-1 text-sm text-gray-800 dark:text-gray-100 ${mono ? 'font-mono' : ''}`}>{children ?? <span>{value || '—'}</span>}{hint && <span className="ml-2 text-xs font-normal text-gray-400">{hint}</span>}</dd></div>
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[status] ?? statusClass.INACTIVE}`}>{statusLabel[status] ?? status}</span>
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
  const [tab, setTab] = useState<Tab>('profile')
  const [modal, setModal] = useState<ModalKind>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [personalForm, setPersonalForm] = useState<PersonalForm>({ fullName: '', nik: '', gender: '', birthPlace: '', birthDate: '', address: '', phone: '', instagram: '', whatsapp: '' })
  const [personalMessage, setPersonalMessage] = useState('')
  const [confirmSave, setConfirmSave] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [targetDistrict, setTargetDistrict] = useState('')
  const [districts, setDistricts] = useState<import('../../types/auth').District[]>([])
  const [transferMessage, setTransferMessage] = useState('')
  const [savingTransfer, setSavingTransfer] = useState(false)
  const isAdmin = useAuthStore((state) => state.user)?.roles.some((role) => role.role === 'CENTRAL_ADMIN' || role.role === 'DISTRICT_ADMIN') ?? false
  const [rankingForm, setRankingForm] = useState<RankingForm>({ rank: '', period: new Date().getFullYear().toString() })
  const [recordForm, setRecordForm] = useState<RecordForm>(emptyRecord)

  const rankings = useMemo(() => player?.pnpRankings ?? [], [player?.pnpRankings])
  const records = useMemo(() => player?.trackRecords ?? [], [player?.trackRecords])

  const reload = () => {
    if (!token || !playerId) return
    setLoading(true)
    setError('')
    api.players.get(token, playerId)
      .then((nextPlayer) => {
        setPlayer(nextPlayer)
        setPersonalForm(personalFormFromPlayer(nextPlayer))
      })
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
    setRecordForm({ title: item?.title ?? '', eventDate: inputDate(item?.eventDate), category: item?.category ?? '', result: item?.result ?? '', description: item?.description ?? '', certificateNo: '', certificateFileId: '', certificateFileName: '' })
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

  // Identity edits (NIK / jenis kelamin) must be confirmed before the request is sent.
  const identityChanged = Boolean(player) && (
    (personalForm.nik.trim() || '') !== (player!.nik ?? '') ||
    (personalForm.gender || null) !== (player!.gender ?? null)
  )

  const submitPersonalInfo = async () => {
    if (!token || !playerId || !personalForm.fullName.trim()) return
    setSaving(true); setFormError(''); setPersonalMessage('')
    try {
      const saved = await api.players.updatePersonalInfo(token, playerId, {
        fullName: personalForm.fullName.trim(),
        ...(identityChanged ? { nik: personalForm.nik.trim(), gender: personalForm.gender || null, confirmIdentityChange: true } : {}),
        birthPlace: personalForm.birthPlace.trim() || null,
        birthDate: personalForm.birthDate || null,
        address: personalForm.address.trim() || null,
        phone: personalForm.phone.trim() || null,
        instagram: personalForm.instagram.trim() || null,
        whatsapp: personalForm.whatsapp.trim() || null,
      })
      setPlayer(saved)
      setPersonalForm(personalFormFromPlayer(saved))
      setPersonalMessage(identityChanged ? 'Data pribadi dan identitas berhasil disimpan.' : 'Informasi pribadi berhasil disimpan.')
    } catch (reason) {
      setFormError(reason instanceof ApiError ? reason.message : 'Informasi pribadi tidak dapat disimpan.')
    } finally { setSaving(false); setConfirmSave(false) }
  }

  const savePersonalInfo = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !playerId || !personalForm.fullName.trim()) return
    if (personalForm.nik.trim() && !/^\d{16}$/.test(personalForm.nik.trim())) {
      setFormError('NIK harus terdiri dari 16 digit.')
      return
    }
    if (identityChanged) { setConfirmSave(true); return }
    await submitPersonalInfo()
  }

  const submitTransfer = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !playerId || !targetDistrict) return
    setSavingTransfer(true); setFormError(''); setTransferMessage('')
    try {
      await api.players.requestTransfer(token, playerId, targetDistrict)
      setTransferOpen(false); setModal(null); setTargetDistrict('')
      setTransferMessage('Permintaan transfer dikirim. Menunggu tinjauan admin kabupaten tujuan di Review Pendaftaran.')
    } catch (reason) {
      setFormError(reason instanceof ApiError ? reason.message : 'Permintaan transfer tidak dapat dikirim.')
    } finally { setSavingTransfer(false) }
  }

  const openTransfer = () => {
    setFormError(''); setTransferMessage(''); setTargetDistrict('')
    setModal('transfer'); setTransferOpen(true)
    if (!districts.length) api.districts.list().then(setDistricts).catch(() => undefined)
  }

  const saveRecord = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !playerId || !recordForm.title.trim()) return
    setSaving(true); setFormError('')
    try {
      const input = { title: recordForm.title.trim(), eventName: null, eventDate: recordForm.eventDate || undefined, category: recordForm.category || undefined, result: recordForm.result || undefined, description: recordForm.description.trim() || undefined }
      const saved = editingId ? await api.players.updateTrackRecord(token, playerId, editingId, input) : await api.players.addTrackRecord(token, playerId, input)
      if (!editingId && (recordForm.certificateNo.trim() || recordForm.certificateFileId)) {
        const certificate = await api.players.addCertificate(token, playerId, { title: `Bukti ${saved.title}`, certificateNo: recordForm.certificateNo.trim() || undefined, fileId: recordForm.certificateFileId || undefined, trackRecordId: saved.id })
        setPlayer((current) => current ? { ...current, certificates: [certificate, ...(current.certificates ?? [])] } : current)
      }
      setPlayer((current) => current ? { ...current, trackRecords: editingId ? current.trackRecords?.map((item) => item.id === editingId ? saved : item) : [saved, ...(current.trackRecords ?? [])] } : current)
      closeModal()
    } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Riwayat prestasi tidak dapat disimpan.') } finally { setSaving(false) }
  }

  const remove = async (kind: RemoveKind, id?: string) => {
    if (!token || !playerId || !id || !window.confirm('Hapus catatan ini? Tindakan ini tidak dapat dibatalkan.')) return
    try {
      if (kind === 'ranking') { await api.players.deletePnpRanking(token, playerId, id); setPlayer((current) => current ? { ...current, pnpRankings: current.pnpRankings?.filter((item) => item.id !== id) } : current) }
      if (kind === 'record') { await api.players.deleteTrackRecord(token, playerId, id); setPlayer((current) => current ? { ...current, trackRecords: current.trackRecords?.filter((item) => item.id !== id), certificates: current.certificates?.map((item) => item.trackRecordId === id ? { ...item, trackRecordId: null } : item) } : current) }
      if (kind === 'certificate') { await api.players.deleteCertificate(token, playerId, id); setPlayer((current) => current ? { ...current, certificates: current.certificates?.filter((item) => item.id !== id) } : current) }
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Catatan tidak dapat dihapus.') }
  }

  if (loading) return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8"><p className="text-sm text-gray-500">Memuat detail pemain...</p></div>
  if (error || !player) return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8"><Link className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" to="/players">Kembali ke daftar pemain</Link><div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error || 'Pemain tidak ditemukan.'}</div></div>

  const tabs: Array<[Tab, string]> = [['profile', 'Informasi pribadi'], ['ranking', 'Peringkat PNP'], ['records', 'Riwayat prestasi']]
  const age = ageFrom(player.birthDate)
  // Peringkat terkini diambil dari catatan PNP paling baru, bukan diketik ulang.
  const latestRanking = rankings[0]
  const genderLabel = player.gender === 'PUTRA' ? 'Laki-laki' : player.gender === 'PUTRI' ? 'Perempuan' : null

  // Ringkasan yang paling sering dicari, sejajar dengan halaman pelatih & wasit.
  const heroSpecs: Array<[string, string | null]> = [
    ['Kabupaten / kota', player.district.name],
    ['Kelompok umur', formatAgeGroup(player.ageGroup, player.gender)],
    ['Klub', player.club?.name ?? null],
    ['Peringkat PNP', latestRanking ? `#${latestRanking.rank}${latestRanking.period ? ` · ${latestRanking.period}` : ''}` : null],
    ['Riwayat prestasi', `${records.length} catatan`],
    ['NIK', player.nik ?? null],
  ]

  return <div className="mx-auto w-full max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-6 flex items-center gap-4"><Link className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" to="/players">Kembali ke daftar pemain</Link></div>
    {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
    {transferMessage && <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700" role="status">{transferMessage}</div>}

    {/* ── Profil ringkas ───────────────────────────────────────── */}
    <section className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,28%)_minmax(0,72%)] lg:gap-8">
        <div>
          {player.photo
            ? <AuthenticatedImage fileId={player.photo.id} alt={`Foto ${player.fullName}`} className="aspect-square w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700" />
            : <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-4xl font-semibold text-gray-300 dark:border-gray-700 dark:text-gray-600">{player.fullName.slice(0, 1).toUpperCase()}</div>}
        </div>

        <div className="min-w-0">
          <p className="font-mono text-xs text-gray-400">{player.playerCode}</p>
          <h1 className="mt-1 text-2xl font-bold leading-snug text-gray-900 dark:text-gray-100 md:text-3xl">{player.fullName}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={player.status} />
            {player.club?.name && <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700">{player.club.name}</span>}
          </div>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            {[genderLabel, formatDate(player.birthDate) === '—' ? null : formatDate(player.birthDate), age != null ? `${age} tahun` : null].filter(Boolean).join(' · ') || '—'}
          </p>
          {(player.whatsapp || player.phone || player.instagram) && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {[player.whatsapp ? `WhatsApp ${player.whatsapp}` : null, player.phone, player.instagram].filter(Boolean).join(' · ')}
          </p>}

          <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-gray-100 pt-5 dark:border-gray-700/60 sm:grid-cols-3">
            {heroSpecs.map(([label, value]) => <HeroField key={label} label={label} value={value} mono={label === 'NIK'} />)}
          </dl>
        </div>
      </div>
    </section>

    {/* ── Tab isi ──────────────────────────────────────────────── */}
    <section className="min-w-0 rounded-xl border border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800">
      <nav className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700/60" aria-label="Detail pemain">{tabs.map(([key, label]) => <button key={key} className={`whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-semibold transition sm:px-5 ${tab === key ? 'border-violet-500 text-violet-700 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`} onClick={() => setTab(key)}>{label}</button>)}</nav>
      <div className="p-5 sm:p-7">
          {tab === 'profile' && <form onSubmit={savePersonalInfo}>
            {formError && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{formError}</div>}
            {personalMessage && <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700" role="status">{personalMessage}</div>}

            <section>
              <div><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Data diri</h2><p className="mt-1 text-sm text-gray-500">Identitas dasar pemain. Perubahan NIK atau jenis kelamin memerlukan konfirmasi.</p></div>
              <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100 pt-1 dark:divide-gray-700/60 dark:border-gray-700/60">
                <PersonalRow label="Nama lengkap"><input className={`${fieldClass} sm:max-w-sm`} value={personalForm.fullName} onChange={(event) => setPersonalForm({ ...personalForm, fullName: event.target.value })} required /></PersonalRow>
                <PersonalRow label="NIK" hint={isAdmin ? 'Dapat diubah dengan konfirmasi' : undefined}><input className={`${fieldClass} sm:max-w-[220px] font-mono`} value={personalForm.nik} inputMode="numeric" pattern="\d{16}" maxLength={16} onChange={(event) => setPersonalForm({ ...personalForm, nik: event.target.value.replace(/\D/g, '') })} /></PersonalRow>
                <PersonalRow label="Jenis kelamin" hint="Menentukan jalur PA/PI kelompok umur"><select className={`${fieldClass} sm:max-w-[200px]`} value={personalForm.gender} onChange={(event) => setPersonalForm({ ...personalForm, gender: event.target.value as PersonalForm['gender'] })}><option value="">Belum diisi</option><option value="PUTRA">Laki-laki</option><option value="PUTRI">Perempuan</option></select></PersonalRow>
                <PersonalRow label="Kelompok umur" value={formatAgeGroup(player.ageGroup, personalForm.gender || null)} hint="Otomatis dari tanggal lahir & jenis kelamin" />
                <PersonalRow label="Tempat lahir"><input className={fieldClass} value={personalForm.birthPlace} onChange={(event) => setPersonalForm({ ...personalForm, birthPlace: event.target.value })} /></PersonalRow>
                <PersonalRow label="Tanggal lahir"><input className={`${fieldClass} sm:max-w-[200px]`} type="date" value={personalForm.birthDate} onChange={(event) => setPersonalForm({ ...personalForm, birthDate: event.target.value })} /></PersonalRow>
              </div>
            </section>

            <section className="mt-8">
              <div><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Kontak</h2><p className="mt-1 text-sm text-gray-500">Alamat dan kanal komunikasi pemain.</p></div>
              <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100 pt-1 dark:divide-gray-700/60 dark:border-gray-700/60">
                <PersonalRow label="Alamat"><textarea className="form-textarea w-full sm:max-w-md" rows={2} value={personalForm.address} onChange={(event) => setPersonalForm({ ...personalForm, address: event.target.value })} /></PersonalRow>
                <PersonalRow label="Telepon"><input className={`${fieldClass} sm:max-w-xs`} type="tel" value={personalForm.phone} onChange={(event) => setPersonalForm({ ...personalForm, phone: event.target.value })} /></PersonalRow>
                <PersonalRow label="WhatsApp"><input className={`${fieldClass} sm:max-w-xs`} type="tel" value={personalForm.whatsapp} onChange={(event) => setPersonalForm({ ...personalForm, whatsapp: event.target.value })} /></PersonalRow>
                <PersonalRow label="Instagram"><input className={`${fieldClass} sm:max-w-xs`} value={personalForm.instagram} onChange={(event) => setPersonalForm({ ...personalForm, instagram: event.target.value })} /></PersonalRow>
              </div>
            </section>

            <section className="mt-8">
              {/* Kabupaten, klub, kode pemain, dan kelompok umur sengaja tidak
                  diulang di sini — semuanya sudah tampil di ringkasan atas. */}
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Registrasi olahraga</h2><p className="mt-1 text-sm text-gray-500">Afiliasi pemain saat ini: <span className="font-medium text-gray-700 dark:text-gray-200">{player.district.name}</span>. Perpindahan kabupaten perlu disetujui kabupaten tujuan.</p></div>{isAdmin && <button type="button" className="btn border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" onClick={openTransfer}>Transfer kabupaten</button>}</div>
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Riwayat perpindahan</p>
                {(player.districtHistory ?? []).length > 0
                  ? <ul className="mt-2 space-y-2">{(player.districtHistory ?? []).map((entry) => <li key={entry.id ?? entry.changedAt} className="rounded-md border border-gray-100 px-3 py-2 text-sm text-gray-600 dark:border-gray-700/60 dark:text-gray-300">{entry.fromDistrict?.name ?? '—'} → {entry.toDistrict?.name ?? player.district.name}<span className="ml-2 text-xs text-gray-400">{formatDate(entry.changedAt)}</span></li>)}</ul>
                  : <p className="mt-2 text-sm text-gray-500">Belum pernah berpindah kabupaten.</p>}
              </div>
            </section>

            <div className="mt-7 flex justify-end border-t border-gray-100 pt-5 dark:border-gray-700/60"><button type="submit" className="btn bg-gray-900 text-sm text-gray-100 hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan informasi'}</button></div>
          </form>}
          {tab === 'ranking' && <div><TabHeader title="Peringkat PNP" description="Riwayat peringkat pemain berdasarkan periode pencatatan." count={rankings.length} actionLabel="Tambah peringkat" onAdd={() => openRanking()} /><TableFrame><table className="w-full min-w-[560px] text-left text-sm"><TableHead labels={['Peringkat', 'Periode', 'Terakhir diperbarui', 'Aksi']} /><tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">{rankings.map((item) => <tr key={item.id ?? `${item.period}-${item.rank}`}><td className="px-4 py-3.5 font-semibold text-gray-800 dark:text-gray-100">#{item.rank}</td><td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{item.period}</td><td className="px-4 py-3.5 text-gray-500">{formatDate(item.updatedAt)}</td><RowActions onEdit={() => openRanking(item)} onDelete={() => remove('ranking', item.id)} /></tr>)}{!rankings.length && <EmptyTable message="Belum ada riwayat peringkat." colSpan={4} />}</tbody></table></TableFrame></div>}
          {tab === 'records' && <div><TabHeader title="Riwayat prestasi" description="Prestasi, kompetisi, dan kegiatan pembinaan yang pernah diikuti pemain." count={records.length} actionLabel="Tambah prestasi" onAdd={() => openRecord()} /><TableFrame><table className="w-full min-w-[720px] text-left text-sm"><TableHead labels={['Prestasi / kegiatan', 'Kategori', 'Capaian', 'Tanggal', 'Bukti sertifikat', 'Aksi']} /><tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">{records.map((item) => <tr key={item.id ?? item.title}><td className="px-4 py-3.5"><p className="font-medium text-gray-800 dark:text-gray-100">{item.title}</p></td><td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{categoryLabels[item.category ?? ''] ?? item.category ?? '—'}</td><td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{resultLabels[item.result ?? ''] ?? item.result ?? '—'}</td><td className="px-4 py-3.5 text-gray-500">{formatDate(item.eventDate)}</td><td className="px-4 py-3.5 text-gray-500">{(player.certificates ?? []).filter((certificate) => certificate.trackRecordId === item.id).length || '—'}</td><RowActions onEdit={() => openRecord(item)} onDelete={() => remove('record', item.id)} /></tr>)}{!records.length && <EmptyTable message="Belum ada riwayat prestasi." colSpan={6} />}</tbody></table></TableFrame></div>}
                  </div>
    </section>

    {confirmSave && <ConfirmDialog title="Konfirmasi perubahan data identitas" message="NIK atau jenis kelamin akan berubah. Perubahan ini tercatat pada log audit dan dapat mengubah kelompok umur pemain. Lanjutkan?" confirmLabel="Ya, ubah identitas" onCancel={() => setConfirmSave(false)} onConfirm={submitPersonalInfo} />}

    {transferOpen && <Modal title="Transfer kabupaten" description="Permintaan transfer dikirim ke Review Pendaftaran kabupaten tujuan untuk disetujui." onClose={() => { setTransferOpen(false); setModal(null) }}>
      <form className="space-y-4 p-5" onSubmit={submitTransfer}>
        <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700/60 dark:bg-gray-900/40 dark:text-gray-300">Kabupaten saat ini: <span className="font-semibold text-gray-800 dark:text-gray-100">{player.district.name}</span></div>
        <label><span className={labelClass}>Kabupaten tujuan</span><select className={fieldClass} value={targetDistrict} onChange={(event) => setTargetDistrict(event.target.value)} required><option value="">Pilih kabupaten tujuan</option>{districts.filter((district) => district.id !== player.district.id).map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select></label>
        <ModalFooter saving={savingTransfer} onClose={() => { setTransferOpen(false); setModal(null) }} label="Kirim permintaan transfer" error={formError} />
      </form>
    </Modal>}

    {modal === 'ranking' && <Modal title={editingId ? 'Edit peringkat PNP' : 'Tambah peringkat PNP'} description="Simpan posisi peringkat beserta periode pencatatannya." onClose={closeModal}><form className="space-y-4 p-5" onSubmit={saveRanking}><div className="grid gap-4 sm:grid-cols-2"><label><span className={labelClass}>Peringkat</span><input className={fieldClass} type="number" min="1" value={rankingForm.rank} onChange={(event) => setRankingForm({ ...rankingForm, rank: event.target.value })} required /></label><label><span className={labelClass}>Periode</span><input className={fieldClass} value={rankingForm.period} onChange={(event) => setRankingForm({ ...rankingForm, period: event.target.value })} required /></label></div><ModalFooter saving={saving} onClose={closeModal} label={editingId ? 'Simpan perubahan' : 'Tambah peringkat'} error={formError} /></form></Modal>}
    {modal === 'record' && <Modal title={editingId ? 'Edit riwayat prestasi' : 'Tambah riwayat prestasi'} description="Catat kompetisi, pelatihan, atau kegiatan pembinaan pemain." onClose={closeModal}><form className="space-y-4 p-5" onSubmit={saveRecord}><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className={labelClass}>Nama prestasi / kegiatan</span><input className={fieldClass} value={recordForm.title} onChange={(event) => setRecordForm({ ...recordForm, title: event.target.value })} required /></label><label><span className={labelClass}>Tanggal</span><input className={fieldClass} type="date" value={recordForm.eventDate} onChange={(event) => setRecordForm({ ...recordForm, eventDate: event.target.value })} /></label><label><span className={labelClass}>Kategori</span><select className="form-select w-full" value={recordForm.category} onChange={(event) => setRecordForm({ ...recordForm, category: event.target.value })}><option value="">Pilih kategori</option><option value="competition">Kompetisi</option><option value="training">Pelatihan</option><option value="other">Lainnya</option></select></label><label><span className={labelClass}>Capaian</span><select className="form-select w-full" value={recordForm.result} onChange={(event) => setRecordForm({ ...recordForm, result: event.target.value })}><option value="">Pilih capaian</option>{resultOptions.map((option) => <option key={option} value={option}>{resultLabels[option]}</option>)}</select></label><label className="sm:col-span-2"><span className={labelClass}>Keterangan</span><textarea className="form-textarea w-full" rows={3} value={recordForm.description} onChange={(event) => setRecordForm({ ...recordForm, description: event.target.value })} /></label><div className="sm:col-span-2 border-t border-gray-100 pt-4 dark:border-gray-700/60"><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Bukti sertifikat (opsional)</p><p className="mt-1 text-xs text-gray-500">Bukti tersimpan langsung bersama prestasi ini. Gambar atau kredensial boleh diisi.</p></div><label><span className={labelClass}>Kredensial / nomor</span><input className={fieldClass} value={recordForm.certificateNo} onChange={(event) => setRecordForm({ ...recordForm, certificateNo: event.target.value })} /></label><label><span className={labelClass}>Gambar sertifikat</span><input className="block w-full text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:text-gray-100" type="file" accept="image/jpeg,image/png" onChange={async (event) => { const file = event.target.files?.[0]; if (!file || !token) return; try { const uploaded = await api.players.uploadCertificateFile(token, file); setRecordForm((current) => ({ ...current, certificateFileId: uploaded.id, certificateFileName: uploaded.originalName })) } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Gambar sertifikat tidak dapat diunggah.') } }} /><span className="mt-1 block text-xs text-gray-500">{recordForm.certificateFileName || 'Tidak ada gambar dipilih'}</span></label></div><ModalFooter saving={saving} onClose={closeModal} label={editingId ? 'Simpan perubahan' : 'Tambah prestasi'} error={formError} /></form></Modal>}
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
