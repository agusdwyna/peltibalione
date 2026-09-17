import { useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../lib/api'
import CertificateFileLink from './CertificateFileLink'

/**
 * Bentuk sertifikat yang datang dari server. Sengaja didefinisikan lokal dan
 * minimal supaya komponen ini tidak terikat pada satu modul — master pelatih
 * dan master wasit memakai struktur yang sama persis.
 */
export type StoredCertificate = {
  id: string
  name: string
  level?: string | null
  issuer?: string | null
  year?: number | null
  file?: { id: string; originalName: string; mimeType: string } | null
}

/** Ke mana berkas diunggah — menentukan `kind` yang dikirim ke endpoint berkas. */
export type CertificateOwner = 'coach' | 'official'

/**
 * Satu baris lisensi/sertifikat yang sedang disunting. `file` menyimpan berkas
 * baru (belum tersimpan) maupun berkas yang sudah ada di server
 * (`persisted: true`), sehingga komponen ini bisa dipakai form pendataan baru
 * maupun edit master.
 */
export type CertificateDraft = {
  /** Kunci stabil untuk React — tidak dikirim ke server. */
  key: string
  /** Terisi bila sertifikat ini sudah tersimpan sebagai baris di master. */
  id?: string
  name: string
  level: string
  issuer: string
  year: string
  file: { id: string; name: string; mimeType: string; persisted: boolean } | null
}

let draftCounter = 0
function newDraftKey() {
  draftCounter += 1
  return `certificate-${draftCounter}`
}

export function emptyCertificateDraft(): CertificateDraft {
  return { key: newDraftKey(), name: '', level: '', issuer: '', year: '', file: null }
}

/** Ubah sertifikat tersimpan menjadi draft yang bisa disunting. */
export function draftsFromCertificates(certificates: StoredCertificate[]): CertificateDraft[] {
  return certificates.map((certificate) => ({
    key: newDraftKey(),
    id: certificate.id,
    name: certificate.name,
    level: certificate.level ?? '',
    issuer: certificate.issuer ?? '',
    year: certificate.year == null ? '' : String(certificate.year),
    file: certificate.file
      ? { id: certificate.file.id, name: certificate.file.originalName, mimeType: certificate.file.mimeType, persisted: true }
      : null,
  }))
}

type Props = {
  drafts: CertificateDraft[]
  setDrafts: Dispatch<SetStateAction<CertificateDraft[]>>
  onError: (message: string) => void
  /** Pemilik sertifikat — menentukan tipe berkas yang dicatat server. */
  owner: CertificateOwner
  /** Token admin; bila kosong, unggahan memakai endpoint publik. */
  token?: string | null
  /**
   * Dipakai halaman detail master: berkas yang sudah tersimpan harus dihapus di
   * server, bukan sekadar hilang dari state.
   */
  onDeletePersistedFile?: (certificateId: string) => Promise<void>
  /** Kalimat pembuka di atas daftar; tiap modul memakai istilahnya sendiri. */
  hint?: string
}

const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200'
const ACCEPT = 'application/pdf,image/jpeg,image/png'

export default function CertificateEditor({ drafts, setDrafts, onError, owner, token, onDeletePersistedFile, hint }: Props) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)

  const patch = (key: string, changes: Partial<CertificateDraft>) => {
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...changes } : draft)))
  }

  const uploadFile = async (key: string, file: File) => {
    setUploadingKey(key)
    try {
      const result = token
        ? await api.players.uploadCertificateFile(token, file, `${owner}-certificate`)
        : await api.files.uploadPublic(file, owner === 'coach' ? 'coachCertificate' : 'officialCertificate')
      patch(key, { file: { id: result.id, name: file.name, mimeType: file.type, persisted: false } })
    } catch {
      onError(`Berkas "${file.name}" gagal diunggah. Pastikan PDF/JPG/PNG maksimal 4MB.`)
    } finally {
      setUploadingKey(null)
    }
  }

  const removeFile = async (key: string) => {
    const draft = drafts.find((item) => item.key === key)
    if (!draft?.file) return

    // Berkas yang sudah tersimpan harus hilang di server juga, kalau tidak ia
    // akan muncul lagi begitu halaman dimuat ulang.
    if (draft.file.persisted && draft.id && onDeletePersistedFile) {
      if (!window.confirm(`Hapus berkas "${draft.file.name}"? Berkasnya ikut terhapus permanen.`)) return
      try {
        await onDeletePersistedFile(draft.id)
      } catch {
        onError('Berkas sertifikat tidak dapat dihapus.')
        return
      }
    }
    patch(key, { file: null })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        {hint ?? 'Boleh lebih dari satu lisensi atau sertifikat.'} Berkas boleh PDF, JPG, atau PNG.
      </p>

      {drafts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-700">
          Belum ada lisensi atau sertifikat yang dicatat.
        </p>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft, index) => (
            <div key={draft.key} className="rounded-lg border border-gray-200 dark:border-gray-700/60">
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5 dark:border-gray-700/60">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Sertifikat {index + 1}</p>
                <button
                  type="button"
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                  onClick={() => setDrafts((current) => current.filter((item) => item.key !== draft.key))}
                >
                  Hapus
                </button>
              </div>
              <div className="grid gap-5 px-4 py-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className={labelClass}>
                    Nama Lisensi / Sertifikat <span className="text-red-500">*</span>
                  </span>
                  <input
                    className="form-input w-full"
                    value={draft.name}
                    maxLength={200}
                    required
                    onChange={(event) => patch(draft.key, { name: event.target.value })}
                  />
                </label>
                <label>
                  <span className={labelClass}>Level / Tingkat</span>
                  <input
                    className="form-input w-full"
                    value={draft.level}
                    maxLength={100}
                    onChange={(event) => patch(draft.key, { level: event.target.value })}
                  />
                </label>
                <label>
                  <span className={labelClass}>Penyelenggara</span>
                  <input
                    className="form-input w-full"
                    value={draft.issuer}
                    maxLength={200}
                    onChange={(event) => patch(draft.key, { issuer: event.target.value })}
                  />
                </label>
                <label>
                  <span className={labelClass}>Tahun Diperoleh</span>
                  <input
                    className="form-input w-full"
                    type="number"
                    min={1950}
                    max={new Date().getFullYear() + 1}
                    value={draft.year}
                    onChange={(event) => patch(draft.key, { year: event.target.value })}
                  />
                </label>
                <div className="sm:col-span-2">
                  <span className={labelClass}>File Sertifikat</span>
                  {draft.file ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700/60">
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-200">{draft.file.name}</span>
                      {/* Berkas yang sudah tersimpan harus tetap bisa dibuka —
                          berkas baru belum ada di server, jadi belum bisa dilihat. */}
                      {draft.file.persisted && (
                        <CertificateFileLink
                          file={{ id: draft.file.id, originalName: draft.file.name, mimeType: draft.file.mimeType }}
                          compact
                        />
                      )}
                      <button
                        type="button"
                        className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700"
                        onClick={() => {
                          void removeFile(draft.key)
                        }}
                      >
                        Hapus berkas
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        className="block max-w-xs text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:text-gray-100"
                        type="file"
                        accept={ACCEPT}
                        disabled={uploadingKey === draft.key}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) void uploadFile(draft.key, file)
                          event.target.value = ''
                        }}
                      />
                      {uploadingKey === draft.key && <span className="text-xs text-violet-600">Mengunggah…</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        onClick={() => setDrafts((current) => [...current, emptyCertificateDraft()])}
      >
        + Tambah Lisensi / Sertifikat
      </button>
    </div>
  )
}

/** Ubah draft menjadi payload yang diterima backend. */
export function certificateDraftsToInput(drafts: CertificateDraft[]) {
  return drafts
    // Baris tanpa nama tidak membawa informasi apa pun.
    .filter((draft) => draft.name.trim())
    .map((draft) => {
      const year = Number(draft.year)
      return {
        ...(draft.id ? { id: draft.id } : {}),
        name: draft.name.trim(),
        ...(draft.level.trim() ? { level: draft.level.trim() } : {}),
        ...(draft.issuer.trim() ? { issuer: draft.issuer.trim() } : {}),
        ...(draft.year && Number.isFinite(year) ? { year } : {}),
        ...(draft.file ? { fileId: draft.file.id } : {}),
      }
    })
}

/** Sertifikat tanpa nama tidak bisa disimpan — beri tahu sebelum submit. */
export function findUnnamedCertificate(drafts: CertificateDraft[]) {
  return drafts.some((draft) => !draft.name.trim() && (draft.file || draft.level.trim() || draft.issuer.trim() || draft.year.trim()))
}
