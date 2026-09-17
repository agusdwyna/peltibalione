import type { ReactNode } from 'react'

type Props = {
  label: string
  /** Keterangan singkat di samping nilai, mis. "Otomatis dari tanggal lahir". */
  hint?: string
  /** Nilai read-only; dipakai untuk kolom turunan yang tidak boleh diedit. */
  value?: ReactNode
  mono?: boolean
  /** Kontrol isian. Bila diisi, `value` diabaikan. */
  children?: ReactNode
}

/**
 * Satu baris isian pada halaman detail: label di kiri, kontrol di kanan.
 * Bentuknya sengaja sama dengan halaman detail pemain supaya seluruh master
 * data terasa satu sistem — dan isian langsung bisa diubah tanpa menekan
 * tombol "Edit" lebih dulu.
 */
export default function FormRow({ label, hint, value, mono = false, children }: Props) {
  return (
    <div className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:gap-6">
      <dt className="shrink-0 text-sm font-medium text-gray-500 sm:w-48">{label}</dt>
      <dd className={`min-w-0 flex-1 text-sm text-gray-800 dark:text-gray-100 ${mono ? 'font-mono' : ''}`}>
        {children ?? <span>{value || '—'}</span>}
        {hint && <span className="ml-2 text-xs font-normal text-gray-400">{hint}</span>}
      </dd>
    </div>
  )
}

/** Pembungkus daftar baris — garis pemisah antar baris seperti halaman pemain. */
export function FormRows({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100 pt-1 dark:divide-gray-700/60 dark:border-gray-700/60">
      {children}
    </div>
  )
}

/**
 * Isian ringkas: label di atas kontrol. Dipakai bersama `FormGrid` untuk
 * bagian yang punya banyak kolom pendek — bila dijadikan baris satu per satu,
 * halamannya memanjang ke bawah tanpa alasan.
 */
export function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  )
}

/** Pembungkus `FormField` — tiga kolom di layar lebar, dua di layar sedang. */
export function FormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 grid gap-5 border-t border-gray-100 pt-5 dark:border-gray-700/60 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  )
}

/** Judul bagian di dalam tab, dengan aksi opsional di kanan. */
export function FormSection({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mt-8 first:mt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Tombol simpan di kaki tab. */
export function SaveRow({ saving, label = 'Simpan perubahan' }: { saving: boolean; label?: string }) {
  return (
    <div className="mt-7 flex justify-end border-t border-gray-100 pt-5 dark:border-gray-700/60">
      <button
        type="submit"
        className="btn bg-gray-900 text-sm text-gray-100 hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800"
        disabled={saving}
      >
        {saving ? 'Menyimpan…' : label}
      </button>
    </div>
  )
}
