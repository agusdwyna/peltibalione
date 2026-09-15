import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { PublicDistrictOverview } from '../types/portal'

export default function PublicDistrictOverviewPage() {
  const { districtId } = useParams<{ districtId: string }>()
  const [overview, setOverview] = useState<PublicDistrictOverview | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { if (districtId) api.districts.overview(districtId).then(setOverview).catch(() => setError('Overview kabupaten/kota tidak dapat dimuat.')) }, [districtId])
  if (error) return <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-900"><div className="mx-auto max-w-3xl rounded-xl bg-white p-8 text-center shadow-xs dark:bg-gray-800"><p className="text-sm text-red-600">{error}</p><Link className="mt-4 inline-block text-sm text-violet-600" to="/">Kembali ke peta Bali</Link></div></main>
  if (!overview) return <main className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500 dark:bg-gray-900">Memuat overview…</main>
  return <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-900 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl"><Link className="text-sm font-medium text-violet-600" to="/">← Kembali ke peta Bali</Link><div className="mt-5 rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-700/60 dark:bg-gray-800"><div className="border-b border-gray-100 px-6 py-6 dark:border-gray-700/60"><p className="text-xs uppercase tracking-wide text-gray-400">Overview Publik</p><h1 className="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">{overview.district.name}</h1><p className="mt-1 text-sm text-gray-500">{overview.district.code} · {overview.district.officialPlayerCount} pemain resmi</p></div><div className="p-6"><h2 className="font-semibold text-gray-800 dark:text-gray-100">Pemain Terdaftar</h2>{overview.players.length === 0 ? <p className="mt-4 text-sm text-gray-500">Belum ada pemain resmi yang ditampilkan.</p> : <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-700/60">{overview.players.map((player) => <div className="flex justify-between py-3 text-sm" key={player.playerCode}><span className="text-gray-800 dark:text-gray-100">{player.fullName}</span><span className="font-mono text-xs text-gray-400">{player.playerCode}</span></div>)}</div>}</div></div></div></main>
}
