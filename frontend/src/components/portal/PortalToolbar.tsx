import type { FormEvent, ReactNode } from 'react'

type PortalToolbarProps = {
  children?: ReactNode
  search?: { value: string; onChange: (value: string) => void; onSubmit: () => void; placeholder: string }
  onReset?: () => void
}

export default function PortalToolbar({ children, search, onReset }: PortalToolbarProps) {
  const submit = (event: FormEvent) => { event.preventDefault(); search?.onSubmit() }
  return <div className="flex flex-col gap-3 border-b border-gray-100 p-3 dark:border-gray-700/60 sm:flex-row sm:flex-wrap sm:items-center">
    {search && <form className="flex min-w-0 flex-1 gap-2" onSubmit={submit}><label className="sr-only" htmlFor="portal-list-search">Pencarian</label><input id="portal-list-search" className="form-input min-w-0 flex-1" placeholder={search.placeholder} value={search.value} onChange={(event) => search.onChange(event.target.value)} /><button className="btn border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" type="submit">Cari</button></form>}
    {children}
    {onReset && <button className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" type="button" onClick={onReset}>Reset</button>}
  </div>
}
