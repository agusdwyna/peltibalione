import { useRef, useState, type FormEvent } from 'react'
import { api, ApiError } from '../../lib/api'
import CertificateFileLink from './CertificateFileLink'
import { certificateDraftsToInput, draftsFromCertificates, emptyCertificateDraft, type CertificateDraft, type CertificateOwner, type StoredCertificate } from './CertificateEditor'

type Props = {
  certificates: StoredCertificate[]
  owner: CertificateOwner
  token: string
  onSave: (input: ReturnType<typeof certificateDraftsToInput>) => Promise<void>
}

export default function CertificateTable({ certificates, owner, token, onSave }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<CertificateDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const open = (item?: StoredCertificate) => {
    setDraft(item ? draftsFromCertificates([item])[0] : emptyCertificateDraft())
    setError('')
    dialog.current?.showModal()
  }
  const close = () => {
    if (saving || uploading) return
    dialog.current?.close()
    setDraft(null)
    setError('')
  }
  const patch = (changes: Partial<CertificateDraft>) => setDraft((current) => current ? { ...current, ...changes } : current)
  const upload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const uploaded = await api.players.uploadCertificateFile(token, file, `${owner}-certificate`)
      patch({ file: { id: uploaded.id, name: uploaded.originalName, mimeType: file.type, persisted: false } })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Berkas gagal diunggah. Silakan coba lagi.')
    } finally { setUploading(false) }
  }
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft || saving || uploading) return
    if (!draft.name.trim()) { setError('Nama lisensi / sertifikat wajib diisi.'); return }
    setSaving(true)
    setError('')
    try {
      const current = draftsFromCertificates(certificates)
      const next = draft.id ? current.map((item) => item.id === draft.id ? draft : item) : [...current, draft]
      await onSave(certificateDraftsToInput(next))
      dialog.current?.close()
      setDraft(null)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Sertifikat tidak dapat disimpan.')
    } finally { setSaving(false) }
  }
  const remove = async (item: StoredCertificate) => {
    if (saving || !window.confirm(`Hapus lisensi / sertifikat "${item.name}"?`)) return
    setSaving(true)
    setError('')
    try { await onSave(certificateDraftsToInput(draftsFromCertificates(certificates.filter((row) => row.id !== item.id)))) }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Sertifikat tidak dapat dihapus.') }
    finally { setSaving(false) }
  }

  return <div>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Lisensi & sertifikasi</h2><p className="mt-1 text-sm text-gray-500">Lisensi dan sertifikat yang dimiliki {owner === 'coach' ? 'pelatih' : 'wasit'}.</p></div>
      <div className="flex items-center gap-3"><span className="text-xs text-gray-500">{certificates.length} catatan</span><button type="button" disabled={saving} onClick={() => open()} className="btn bg-gray-900 text-sm text-gray-100 hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800">Tambah sertifikat</button></div>
    </div>
    {error && !draft && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
    <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700/60">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/30 dark:text-gray-400"><tr>{['Lisensi / sertifikat', 'Level / tingkat', 'Penyelenggara', 'Tahun', 'Berkas', 'Aksi'].map((label, index) => <th key={label} className={`px-4 py-3 font-semibold ${index === 5 ? 'text-right' : 'text-left'}`}>{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {certificates.map((item) => <tr key={item.id}>
            <td className="px-4 py-3.5 font-medium text-gray-800 dark:text-gray-100">{item.name}</td>
            <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{item.level || '—'}</td>
            <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{item.issuer || '—'}</td>
            <td className="px-4 py-3.5 text-gray-500">{item.year ?? '—'}</td>
            <td className="px-4 py-3.5 text-gray-500">{item.file ? <CertificateFileLink file={item.file} compact /> : '—'}</td>
            <td className="whitespace-nowrap px-4 py-3.5 text-right"><button type="button" disabled={saving} onClick={() => open(item)} className="mr-3 text-sm font-medium text-violet-700 hover:text-violet-800 dark:text-violet-400">Edit</button><button type="button" disabled={saving} onClick={() => void remove(item)} className="text-sm font-medium text-red-700 hover:text-red-800 dark:text-red-400">Hapus</button></td>
          </tr>)}
          {!certificates.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">Belum ada lisensi atau sertifikat.</td></tr>}
        </tbody>
      </table>
    </div>
    <dialog ref={dialog} aria-labelledby="certificate-dialog-title" onCancel={(event) => { event.preventDefault(); close() }} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-xl bg-white p-0 text-gray-800 shadow-xl backdrop:bg-gray-900/50 dark:bg-gray-800 dark:text-gray-100">
      {draft && <form onSubmit={save} className="space-y-4 p-5">
        <h2 id="certificate-dialog-title" className="text-lg font-semibold">{draft.id ? 'Edit' : 'Tambah'} lisensi / sertifikat</h2>
        <fieldset disabled={saving || uploading} className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-1 block text-sm font-medium">Nama lisensi / sertifikat</span><input autoFocus className="form-input w-full" required maxLength={200} value={draft.name} onChange={(event) => patch({ name: event.target.value })} /></label>
          <label><span className="mb-1 block text-sm font-medium">Level / tingkat</span><input className="form-input w-full" maxLength={100} value={draft.level} onChange={(event) => patch({ level: event.target.value })} /></label>
          <label><span className="mb-1 block text-sm font-medium">Penyelenggara</span><input className="form-input w-full" maxLength={200} value={draft.issuer} onChange={(event) => patch({ issuer: event.target.value })} /></label>
          <label><span className="mb-1 block text-sm font-medium">Tahun diperoleh</span><input className="form-input w-full" type="number" min={1950} max={new Date().getFullYear() + 1} value={draft.year} onChange={(event) => patch({ year: event.target.value })} /></label>
          <div className="sm:col-span-2"><p className="mb-1 text-sm font-medium">Berkas sertifikat</p>{draft.file ? <div className="flex flex-wrap items-center gap-3 text-sm"><span>{draft.file.name}</span>{draft.file.persisted && <CertificateFileLink file={{ id: draft.file.id, originalName: draft.file.name, mimeType: draft.file.mimeType }} compact />}<button type="button" className="text-red-600" onClick={() => patch({ file: null })}>Hapus berkas</button></div> : <input aria-label="Unggah berkas sertifikat" type="file" accept="application/pdf,image/jpeg,image/png" className="block w-full text-sm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = '' }} />}<p className="mt-2 text-xs text-gray-500">PDF, JPG, atau PNG, maksimal 4 MB.</p></div>
        </fieldset>
        {uploading && <p role="status" className="text-sm text-violet-600">Mengunggah…</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700"><button type="button" disabled={saving || uploading} onClick={close} className="btn border border-gray-200 text-sm dark:border-gray-600">Batal</button><button type="submit" disabled={saving || uploading} className="btn bg-gray-900 text-sm text-gray-100 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800">{saving ? 'Menyimpan…' : 'Simpan'}</button></div>
      </form>}
    </dialog>
  </div>
}
