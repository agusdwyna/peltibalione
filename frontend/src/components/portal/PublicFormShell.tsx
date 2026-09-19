import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  /** Label kecil di atas judul, mis. "Form Pendaftaran Pemain". */
  eyebrow: string
  title: string
  description?: string | null
  districtName?: string | null
  /** Judul blok bantuan di panel kiri (desktop). */
  asideTitle?: string
  /** Poin bantuan singkat yang tampil di panel kiri. */
  asidePoints?: string[]
  /** Pesan sukses — menggantikan seluruh isi form bila terisi. */
  message?: string
  /** Tautan lanjutan setelah pengajuan berhasil dikirim. */
  messageAction?: ReactNode
  children: ReactNode
}

/**
 * Kerangka bersama seluruh halaman form publik.
 *
 * Bentuknya sengaja landscape di desktop (panel info kiri + isian kanan) dan
 * portrait di mobile (menumpuk), supaya keempat form pendataan — pemain,
 * lapangan, pelatih, dan wasit — terasa satu sistem dengan halaman publik lain.
 */
export default function PublicFormShell({
  eyebrow,
  title,
  description,
  districtName,
  asideTitle,
  asidePoints,
  message,
  messageAction,
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-gray-50 pb-16 dark:bg-gray-900">
      <header className="border-b border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link className="inline-flex items-center gap-2.5" to="/" aria-label="PELTI Bali One">
            <svg className="h-8 w-8 fill-violet-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden><path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" /></svg>
            <span className="text-sm font-bold uppercase tracking-[0.16em] text-gray-800 dark:text-gray-100">PELTI Bali One</span>
          </Link>
          <Link className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" to="/check-status">Cek status pendaftaran</Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* ── Kartu landscape: panel info + isian ─────────────────── */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800">
          <div className="grid lg:grid-cols-[minmax(0,32%)_minmax(0,68%)]">
            {/* Panel kiri — ringkas di atas, penuh di samping saat desktop. */}
            <div className="border-b border-gray-100 bg-gray-50/70 p-6 dark:border-gray-700/60 dark:bg-gray-900/20 lg:border-b-0 lg:border-r lg:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{eyebrow}</p>
              <h1 className="mt-2 text-2xl font-bold leading-snug tracking-[-0.02em] text-gray-900 dark:text-gray-100">{title}</h1>
              {districtName && <span className="mt-3 inline-block rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-400">{districtName}</span>}
              {description && <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{description}</p>}

              {asidePoints && asidePoints.length > 0 && <div className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-700/60">
                {asideTitle && <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{asideTitle}</h2>}
                <ul className="mt-3 space-y-2.5">
                  {asidePoints.map((point) => <li key={point} className="flex gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden />
                    {point}
                  </li>)}
                </ul>
              </div>}
            </div>

            {/* Panel kanan — isian atau pesan hasil. */}
            <div className="p-6 sm:p-8">
              {message
                ? <div className="rounded-lg border border-green-200 bg-green-50 p-5 dark:border-green-900/40 dark:bg-green-950/20" role="status">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">{message}</p>
                  {messageAction}
                </div>
                : children}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
