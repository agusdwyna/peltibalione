import { Link } from 'react-router-dom'
import { districtLabel } from '../lib/district'

/**
 * Ditampilkan saat pengunjung membuka form pendataan yang belum dibuka atau
 * sudah ditutup. Sengaja berupa halaman penuh — bukan pesan error — supaya
 * pengunjung tahu bahwa ini keadaan sementara, bukan kegagalan sistem.
 */
export default function FormClosedNotice({
  subject,
  districtName,
}: {
  /** Sebutan jenis pendataan, mis. "peserta", "pelatih", "lapangan", "wasit". */
  subject: string
  /** Nama kabupaten/kota; boleh kosong bila belum diketahui. */
  districtName?: string | null
}) {
  const wilayah = districtName ? `wilayah ${districtLabel(districtName)}` : 'wilayah ini'

  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16 dark:bg-gray-900 sm:px-6 lg:px-8">
    <div className="w-full max-w-lg">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700/60 dark:bg-gray-800 sm:p-10">
        {/* Ikon jam — penanda keadaan sementara, bukan kegagalan sistem. */}
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400" aria-hidden>
          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>

        <h1 className="mt-5 text-xl font-bold tracking-[-0.01em] text-gray-900 dark:text-gray-100">Pendaftaran belum dibuka</h1>

        <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          Mohon maaf, pendaftaran untuk {subject} {wilayah} belum dibuka. Tunggu informasi selanjutnya ya dari pengurus.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3 border-t border-gray-100 pt-6 dark:border-gray-700/60">
          <Link className="btn border border-gray-200 bg-white px-5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700" to="/">
            Kembali ke peta Bali
          </Link>
          <Link className="btn bg-gray-900 px-5 text-sm text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white" to="/check-status">
            Cek status pendaftaran
          </Link>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">PELTI Bali One</p>
    </div>
  </main>
}
