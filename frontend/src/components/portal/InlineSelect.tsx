import { useRef, useState } from 'react'

type Props = {
  label: string
  value: string
  options: ReadonlyArray<{ value: string; label: string }>
  className?: string
  disabled?: boolean
  onSave: (value: string) => Promise<void>
}

export default function InlineSelect({ label, value, options, className = '', disabled, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)

  const save = async (next: string) => {
    if (pending.current || next === value) return
    pending.current = true
    setSaving(true)
    setError('')
    try {
      await onSave(next)
    } catch {
      setError('Gagal menyimpan. Silakan coba lagi.')
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <select
        aria-label={label}
        aria-busy={saving}
        title={label}
        value={value}
        disabled={disabled || saving}
        onChange={(event) => void save(event.target.value)}
        className={`max-w-full cursor-pointer rounded-full border-0 py-1 pl-2.5 pr-7 text-xs font-medium focus:ring-2 focus:ring-violet-500 disabled:cursor-wait disabled:opacity-60 ${className}`}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {saving && <span role="status" className="text-xs text-gray-500">Menyimpan…</span>}
      {error && <span role="alert" className="max-w-48 text-xs text-red-600">{error}</span>}
    </div>
  )
}
