import { useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../lib/api'
import AuthenticatedImage from '../../components/ui/AuthenticatedImage'
import { AMENITY_OPTIONS, MAX_AMENITY_PHOTOS, amenityLabel } from '../../types/facility'

/**
 * Satu baris sarana yang sedang disunting. `photos` menyimpan pratinjau lokal
 * (foto baru) maupun foto yang sudah tersimpan di server (`persisted: true`),
 * sehingga komponen ini bisa dipakai form pendataan baru maupun edit master.
 */
export type AmenityDraft = {
  /** Kunci stabil untuk React — tidak dikirim ke server. */
  key: string
  /** Terisi bila sarana ini sudah tersimpan sebagai baris di master. */
  id?: string
  code: string
  customName: string
  description: string
  photos: Array<{ id: string; url: string | null; name: string; persisted: boolean }>
}

let draftCounter = 0
export function newDraftKey() {
  draftCounter += 1
  return `amenity-${draftCounter}`
}

export function draftFor(code: string, customName = ''): AmenityDraft {
  return { key: newDraftKey(), code, customName, description: '', photos: [] }
}

/**
 * Ubah sarana tersimpan menjadi draft yang bisa disunting. Foto lama ditandai
 * `persisted` dan tidak punya URL blob lokal — gambarnya diambil komponen
 * lewat endpoint berkas yang terproteksi token.
 */
export function draftsFromFacility(
  amenities: Array<{ id: string; code: string; customName?: string | null; description?: string | null; photos?: Array<{ id: string; originalName: string }> }>,
): AmenityDraft[] {
  return amenities.map((amenity) => ({
    key: newDraftKey(),
    id: amenity.id,
    code: amenity.code,
    customName: amenity.customName ?? '',
    description: amenity.description ?? '',
    photos: (amenity.photos ?? []).map((photo) => ({ id: photo.id, url: null, name: photo.originalName, persisted: true })),
  }))
}

type Props = {
  drafts: AmenityDraft[]
  setDrafts: Dispatch<SetStateAction<AmenityDraft[]>>
  onError: (message: string) => void
  /** Token admin; bila kosong, unggahan memakai endpoint publik. */
  token?: string | null
  /**
   * Dipakai halaman detail master: foto yang sudah tersimpan harus dihapus di
   * server, bukan sekadar hilang dari state. Tanpa ini, penghapusan hanya lokal
   * (form pendataan baru, di mana belum ada apa pun di server).
   */
  onDeletePersistedPhoto?: (amenityId: string, photoId: string) => Promise<void>
  /** Klik foto membuka pratinjau besar; tanpa ini foto hanya ditampilkan. */
  onPreviewPhoto?: (photoId: string, label: string) => void
}

const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200'

export default function AmenityEditor({ drafts, setDrafts, onError, token, onDeletePersistedPhoto, onPreviewPhoto }: Props) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)

  const masterChecked = (code: string) => drafts.some((draft) => draft.code === code)
  const customDrafts = drafts.filter((draft) => draft.code === 'LAINNYA')

  const toggleMaster = (code: string, checked: boolean) => {
    setDrafts((current) => checked
      ? [...current, draftFor(code)]
      : current.filter((draft) => draft.code !== code))
  }

  const patch = (key: string, changes: Partial<AmenityDraft>) => {
    setDrafts((current) => current.map((draft) => draft.key === key ? { ...draft, ...changes } : draft))
  }

  const uploadPhotos = async (key: string, files: FileList) => {
    const draft = drafts.find((item) => item.key === key)
    if (!draft) return
    const room = MAX_AMENITY_PHOTOS - draft.photos.length
    if (room <= 0) { onError(`Maksimal ${MAX_AMENITY_PHOTOS} foto per sarana.`); return }

    const list = Array.from(files).slice(0, room)
    if (list.length < files.length) onError(`Hanya ${room} foto lagi yang bisa ditambahkan untuk sarana ini.`)

    setUploadingKey(key)
    for (const file of list) {
      try {
        const result = token
          ? await api.players.uploadCertificateFile(token, file, 'amenity')
          : await api.files.uploadPublic(file, 'amenityPhoto')
        const url = URL.createObjectURL(file)
        setDrafts((current) => current.map((item) => item.key === key
          ? { ...item, photos: [...item.photos, { id: result.id, url, name: file.name, persisted: false }] }
          : item))
      } catch {
        onError(`Foto "${file.name}" gagal diunggah. Pastikan JPEG/PNG maksimal 4MB.`)
      }
    }
    setUploadingKey(null)
  }

  const removePhoto = async (key: string, photoId: string) => {
    const draft = drafts.find((item) => item.key === key)
    const target = draft?.photos.find((photo) => photo.id === photoId)
    if (!draft || !target) return

    // Foto yang sudah tersimpan harus hilang di server juga, kalau tidak ia akan
    // muncul lagi begitu halaman dimuat ulang.
    if (target.persisted && draft.id && onDeletePersistedPhoto) {
      if (!window.confirm(`Hapus foto "${target.name}"? Berkasnya ikut terhapus permanen.`)) return
      try {
        await onDeletePersistedPhoto(draft.id, photoId)
      } catch {
        onError('Foto tidak dapat dihapus.')
        return
      }
    }

    if (!target.persisted && target.url) URL.revokeObjectURL(target.url)
    setDrafts((current) => current.map((item) => item.key === key
      ? { ...item, photos: item.photos.filter((photo) => photo.id !== photoId) }
      : item))
  }

  const PhotoBlock = ({ draft }: { draft: AmenityDraft }) => <div>
    <div className="flex flex-wrap items-center gap-3">
      <input
        className="block max-w-[15rem] text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-xs file:text-gray-100"
        type="file"
        accept="image/jpeg,image/png"
        multiple
        disabled={uploadingKey === draft.key || draft.photos.length >= MAX_AMENITY_PHOTOS}
        onChange={(event) => { const files = event.target.files; if (files?.length) void uploadPhotos(draft.key, files); event.target.value = '' }}
      />
      <span className="text-xs text-gray-500">{draft.photos.length}/{MAX_AMENITY_PHOTOS} foto</span>
      {uploadingKey === draft.key && <span className="text-xs text-violet-600">Mengunggah…</span>}
    </div>
    {draft.photos.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">
      {draft.photos.map((photo) => <li key={photo.id} className="relative">
        {/* Foto baru punya URL blob lokal; foto yang sudah tersimpan diambil
            lewat endpoint berkas (butuh token), bukan ditampilkan sebagai nama. */}
        <button
          type="button"
          className={onPreviewPhoto ? 'block cursor-zoom-in' : 'block cursor-default'}
          onClick={() => onPreviewPhoto?.(photo.id, photo.name)}
          aria-label={onPreviewPhoto ? `Perbesar ${photo.name}` : photo.name}
        >
          {photo.url
            ? <img className="h-20 w-28 rounded border border-gray-200 object-cover transition hover:opacity-90 dark:border-gray-700" src={photo.url} alt={photo.name} />
            : <AuthenticatedImage fileId={photo.id} alt={photo.name} className="h-20 w-28 rounded border border-gray-200 object-cover transition hover:opacity-90 dark:border-gray-700" />}
        </button>
        <button
          type="button"
          className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-900/85 text-xs text-white hover:bg-gray-900"
          aria-label={`Hapus foto ${photo.name}`}
          onClick={() => { void removePhoto(draft.key, photo.id) }}
        >×</button>
      </li>)}
    </ul>}
  </div>

  return <div className="space-y-6">
    <div>
      <p className="mb-3 text-xs text-gray-500">Centang fasilitas yang tersedia. Setiap yang dicentang bisa diberi deskripsi dan hingga {MAX_AMENITY_PHOTOS} foto — keduanya opsional dan boleh dilengkapi nanti.</p>
      <div className="space-y-3">
        {AMENITY_OPTIONS.filter((option) => option.value !== 'LAINNYA').map((option) => {
          const draft = drafts.find((item) => item.code === option.value)
          return <div key={option.value} className={`rounded-lg border transition ${draft ? 'border-violet-200 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-900/10' : 'border-gray-200 dark:border-gray-700/60'}`}>
            <label className="flex cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100">
              <input className="form-checkbox" type="checkbox" checked={masterChecked(option.value)} onChange={(event) => toggleMaster(option.value, event.target.checked)} />
              {option.label}
            </label>
            {draft && <div className="space-y-4 border-t border-violet-100 px-4 py-4 dark:border-violet-900/40">
              <label className="block">
                <span className={labelClass}>Deskripsi</span>
                <textarea className="form-textarea w-full" rows={2} maxLength={1000} value={draft.description} onChange={(event) => patch(draft.key, { description: event.target.value })} />
              </label>
              <PhotoBlock draft={draft} />
            </div>}
          </div>
        })}
      </div>
    </div>

    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Sarana Lainnya</h3>
          <p className="mt-1 text-xs text-gray-500">Fasilitas yang belum ada di daftar di atas. Boleh ditambahkan lebih dari satu.</p>
        </div>
        <button type="button" className="btn border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" onClick={() => setDrafts((current) => [...current, draftFor('LAINNYA')])}>Tambah sarana</button>
      </div>

      {customDrafts.length === 0
        ? <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-700">Belum ada sarana tambahan.</p>
        : <div className="space-y-3">
          {customDrafts.map((draft) => <div key={draft.key} className="rounded-lg border border-gray-200 dark:border-gray-700/60">
            <div className="flex items-start gap-3 px-4 py-3">
              <label className="min-w-0 flex-1">
                <span className={labelClass}>Nama Sarana <span className="text-red-500">*</span></span>
                <input className="form-input w-full" value={draft.customName} maxLength={200} required onChange={(event) => patch(draft.key, { customName: event.target.value })} />
              </label>
              <button type="button" className="mt-7 shrink-0 text-sm font-medium text-red-600 hover:text-red-700" onClick={() => setDrafts((current) => current.filter((item) => item.key !== draft.key))}>Hapus</button>
            </div>
            <div className="space-y-4 border-t border-gray-100 px-4 py-4 dark:border-gray-700/60">
              <label className="block">
                <span className={labelClass}>Deskripsi</span>
                <textarea className="form-textarea w-full" rows={2} maxLength={1000} value={draft.description} onChange={(event) => patch(draft.key, { description: event.target.value })} />
              </label>
              <PhotoBlock draft={draft} />
            </div>
          </div>)}
        </div>}
    </div>
  </div>
}

/** Ubah draft menjadi payload yang diterima backend. */
export function draftsToInput(drafts: AmenityDraft[]) {
  return drafts.map((draft) => ({
    ...(draft.id ? { id: draft.id } : {}),
    code: draft.code,
    ...(draft.code === 'LAINNYA' ? { customName: draft.customName.trim() } : {}),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    photoIds: draft.photos.filter((photo) => !photo.persisted).map((photo) => photo.id),
  }))
}

/** Sarana "Lainnya" tanpa nama tidak membawa informasi apa pun. */
export function findUnnamedCustom(drafts: AmenityDraft[]) {
  return drafts.some((draft) => draft.code === 'LAINNYA' && !draft.customName.trim())
}
