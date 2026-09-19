import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BackLink from './BackLink'

type Props = {
  /** Label kecil di atas judul, mis. "Pemain Terverifikasi". */
  eyebrow: string
  title: string
  subtitle?: ReactNode
  /** Kabupaten asal entitas ini, bila ada. */
  districtName?: string | null
  /** Kode resmi (PL-/CO-/RF-/FC-) — ditampilkan sebagai rujukan. */
  code?: string | null
  /** Foto profil bulat; hanya untuk entitas yang fotonya boleh tampil publik. */
  photoUrl?: string | null
  /** Kembali ke mana. Default ke halaman detail kabupaten bila districtId ada. */
  backTo?: string
  backLabel?: string
  loading?: boolean
  error?: string
  children: ReactNode
}

/**
 * Kerangka bersama seluruh halaman detail publik.
 *
 * Sama seperti `PublicFormShell`, tujuannya membuat keempat halaman detail
 * terbaca sebagai satu sistem: kepala halaman yang sama, lebar yang sama, dan
 * aksi kembali yang sama. Perbedaan antar halaman hanya di isinya.
 */
export default function PublicDetailShell({
  eyebrow,
  title,
  subtitle,
  districtName,
  code,
  photoUrl,
  backTo = '/',
  backLabel = 'Kembali ke peta Bali',
  loading,
  error,
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
        <BackLink to={backTo} label={backLabel} />

        {error ? (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700/60 dark:bg-gray-800">
            <p className="text-sm text-red-600">{error}</p>
            <BackLink className="mt-4" to={backTo} label={backLabel} />
          </div>
        ) : loading ? (
          <p className="mt-10 text-center text-sm text-gray-500">Memuat data…</p>
        ) : (
          <>
            {/* ── Kepala entitas ───────────────────────────────────── */}
            <div className="mt-6 flex flex-wrap items-start gap-5 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700/60 dark:bg-gray-800 sm:p-8">
              {photoUrl && <img className="h-20 w-20 shrink-0 rounded-full object-cover" src={photoUrl} alt="" loading="lazy" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{eyebrow}</p>
                <h1 className="mt-1.5 text-2xl font-bold tracking-[-0.02em] text-gray-900 dark:text-gray-100 sm:text-3xl">{title}</h1>
                {subtitle && <div className="mt-2 text-sm text-gray-500">{subtitle}</div>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {districtName && <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-400">{districtName}</span>}
                  {code && <span className="rounded-full bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">{code}</span>}
                </div>
              </div>
            </div>

            {children}
          </>
        )}
      </div>
    </main>
  )
}

/** Kartu berjudul untuk satu bagian data. */
export function DetailCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700/60 dark:bg-gray-800 sm:p-8">
    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
    {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    <div className="mt-5">{children}</div>
  </section>
}

/** Daftar pasangan label–nilai. Nilai kosong tampil sebagai satu tanda pisah. */
export function DetailRows({ rows }: { rows: Array<[string, ReactNode]> }) {
  const visible = rows.filter(([, value]) => value !== null && value !== undefined && value !== '')
  if (!visible.length) return <p className="text-sm text-gray-400">Belum ada data.</p>
  return <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
    {visible.map(([label, value]) => <div key={label}>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800 dark:text-gray-200">{value}</dd>
    </div>)}
  </dl>
}

/** Keadaan kosong yang menjelaskan, bukan sekadar "tidak ada data". */
export function DetailEmpty({ message }: { message: string }) {
  return <p className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700/60">{message}</p>
}
