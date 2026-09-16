import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'

/**
 * The file endpoint is bearer-token protected, so an <img src> pointed at it
 * would return 401. This resolves the file to a blob URL for the session and
 * revokes it on unmount.
 */
export default function AuthenticatedImage({ fileId, alt, className, onClick }: { fileId?: string | null; alt: string; className?: string; onClick?: () => void }) {
  const token = useAuthStore((state) => state.token)
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!token || !fileId) { setUrl(null); return }
    let objectUrl: string | null = null
    let active = true
    api.files.fetchBlobUrl(token, fileId)
      .then((next) => { if (active) { objectUrl = next; setUrl(next) } else URL.revokeObjectURL(next) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [token, fileId])

  if (!fileId) return null
  if (failed) return <div className={`flex items-center justify-center bg-gray-100 text-xs text-gray-400 dark:bg-gray-700 ${className ?? ''}`}>Gagal memuat</div>
  if (!url) return <div className={`animate-pulse bg-gray-100 dark:bg-gray-700 ${className ?? ''}`} aria-hidden="true" />

  return <img className={className} src={url} alt={alt} loading="lazy" onClick={onClick} />
}
