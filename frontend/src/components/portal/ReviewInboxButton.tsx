import { Link } from 'react-router-dom'

type Props = {
  /** Halaman antrean review yang dituju. */
  to: string
  /** Teks tombol, mis. "Review Lapangan". */
  label: string
  /**
   * Jumlah pengajuan yang menunggu review. `null` berarti belum diketahui —
   * misalnya ketika Semua Wilayah belum memilih satu distrik — sehingga
   * lencana tidak ditampilkan alih-alih menampilkan angka 0 yang menyesatkan.
   */
  count: number | null
}

/**
 * Pintu masuk ke antrean review dari halaman master data. Ditempatkan di sini
 * (bukan sebagai menu sidebar tersendiri) supaya review selalu terbaca sebagai
 * bagian dari data yang sedang dibuka, dan lencananya langsung terlihat saat
 * ada pengajuan yang menunggu.
 */
export default function ReviewInboxButton({ to, label, count }: Props) {
  const pending = count != null && count > 0

  return (
    <Link
      className={`btn relative gap-2 border text-sm transition ${
        pending
          ? 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-900/20 dark:text-violet-300'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
      }`}
      to={to}
      // Jumlah dibacakan pembaca layar lewat label, bukan hanya lewat warna.
      aria-label={pending ? `${label}, ${count} pengajuan menunggu review` : label}
    >
      {label}
      {pending && (
        <span
          className="inline-flex min-w-5 items-center justify-center rounded-full bg-violet-600 px-1.5 py-0.5 text-xs font-semibold leading-none text-white"
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
