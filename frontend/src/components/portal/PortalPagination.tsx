import type { PaginationMeta } from '../../types/portal'

type PortalPaginationProps = { meta: PaginationMeta | null; onPageChange: (page: number) => void }

export default function PortalPagination({ meta, onPageChange }: PortalPaginationProps) {
  if (!meta || meta.totalPages <= 1) return null
  return <div className="flex items-center justify-between border-t border-gray-100 p-4 text-sm dark:border-gray-700/60" aria-label="Pagination">
    <button className="font-medium text-violet-600 disabled:text-gray-300" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>Sebelumnya</button>
    <span className="text-gray-500">Halaman {meta.page} dari {meta.totalPages}</span>
    <button className="font-medium text-violet-600 disabled:text-gray-300" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)}>Berikutnya</button>
  </div>
}
