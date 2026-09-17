/** Satu angka ringkasan di kepala halaman master data. */
export type StatCard = { label: string; value: number }

/**
 * Deretan kartu angka di atas tabel master data. Jumlah kolomnya mengikuti
 * banyaknya kartu agar tidak ada sel kosong menggantung.
 */
export default function StatCards({ cards }: { cards: StatCard[] }) {
  if (!cards.length) return null
  const columns = cards.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'

  return (
    <div className={`mb-6 grid gap-4 ${columns}`}>
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-700/60 dark:bg-gray-800">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-100">
            {new Intl.NumberFormat('id-ID').format(card.value)}
          </p>
        </div>
      ))}
    </div>
  )
}

/** Sebaran per distrik — hanya bermakna saat melihat seluruh wilayah. */
export function DistrictBreakdown({
  title,
  rows,
}: {
  title: string
  rows: Array<{ districtId: string; name: string; total: number }>
}) {
  if (!rows.length) return null
  return (
    <section className="mt-6 rounded-xl bg-white p-5 shadow-xs dark:bg-gray-800 sm:p-6">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <li key={row.districtId} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700/60">
            <span className="text-sm text-gray-700 dark:text-gray-200">{row.name}</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{row.total}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
