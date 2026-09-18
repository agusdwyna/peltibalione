import { useState } from 'react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
/** Bentuk minimal berkas dari server; sama untuk pelatih maupun wasit. */
export type StoredFile = { id: string; originalName: string; mimeType: string; size?: number }

/**
 * Berkas sertifikat boleh berupa PDF, jadi tidak selalu bisa ditampilkan
 * sebagai gambar. Endpoint berkas juga dilindungi bearer token sehingga
 * <a href> biasa akan kena 401 — berkas diambil sebagai blob lalu dibuka
 * di tab baru.
 */
export default function CertificateFileLink({ file, compact = false }: { file?: StoredFile | null; compact?: boolean }) {
  const token = useAuthStore((state) => state.token)
  const [opening, setOpening] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!file) return compact ? null : <span className="shrink-0 text-xs text-gray-400">Tanpa berkas</span>

  const open = async () => {
    if (!token || opening) return
    setOpening(true)
    setFailed(false)
    try {
      const url = await api.files.fetchBlobUrl(token, file.id)
      window.open(url, '_blank', 'noopener,noreferrer')
      // Blob URL dilepas setelah tab sempat memuatnya; melepas seketika
      // membuat tab baru gagal membaca isinya.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setFailed(true)
    } finally {
      setOpening(false)
    }
  }

  const trigger = (
    <button
      type="button"
      className="text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50"
      disabled={opening}
      onClick={() => {
        void open()
      }}
    >
      {opening ? 'Membuka…' : 'Lihat berkas'}
    </button>
  )

  // Mode ringkas dipakai di dalam editor, di mana nama berkas sudah tampil.
  if (compact) return <span className="shrink-0">{trigger}{failed && <span className="ml-2 text-[11px] text-red-600">Gagal memuat</span>}</span>

  return (
    <div className="shrink-0 text-right">
      {trigger}
      <p className="mt-0.5 max-w-[12rem] truncate text-[11px] text-gray-400">{file.originalName}</p>
      {failed && <p className="text-[11px] text-red-600">Gagal memuat</p>}
    </div>
  )
}
