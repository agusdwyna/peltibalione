import { Link } from 'react-router-dom'

type Props = {
  /**
   * Tujuan kembali. Sengaja berupa rute eksplisit, bukan `navigate(-1)`, agar
   * tombol ini selalu mendarat di halaman yang dimaksud — riwayat browser bisa
   * berisi halaman lain bila pengguna membuka tautan langsung.
   */
  to: string
  /** Sebutan tujuan, mis. "Kembali ke daftar pelatih". */
  label: string
  className?: string
}

/**
 * Aksi kembali yang dipakai bersama seluruh halaman detail dan review.
 * Bentuknya sengaja satu: chevron + label abu-abu yang menggelap saat hover,
 * supaya navigasi mundur terasa sama di mana pun.
 */
export default function BackLink({ to, label, className = '' }: Props) {
  return (
    <Link
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 ${className}`}
      to={to}
    >
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </Link>
  )
}
