import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BaliDistrictMap from '../components/landing/BaliDistrictMap'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import { useWorkspaceStore } from '../stores/workspace.store'
import type { District } from '../types/auth'

function StatCard({ label, value, active }: { label: string; value: number; active: boolean }) {
  return <div className="border-l border-gray-300 pl-5 dark:border-gray-600"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p><p className={`mt-2 text-5xl font-bold tracking-[-0.04em] ${active ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>{value.toLocaleString('id-ID')}</p><p className="mt-2 text-xs text-gray-500">{active ? 'Data resmi saat ini' : 'Segera tersedia'}</p></div>
}

export default function LandingMapPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const selectWorkspace = useWorkspaceStore((state) => state.selectWorkspace)
  const selectAllRegions = useWorkspaceStore((state) => state.selectAllRegions)
  const [districts, setDistricts] = useState<District[]>([])
  const [stats, setStats] = useState({ athletes: 0, coaches: 0, facilities: 0, referees: 0 })
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [animatedAthletes, setAnimatedAthletes] = useState(0)
  const [error, setError] = useState('')
  const isCentral = user?.roles.some((role) => role.role === 'CENTRAL_ADMIN') ?? false
  const assignedId = user?.roles.find((role) => role.role === 'DISTRICT_ADMIN')?.districtId
  const disabledCodes = useMemo(() => user && !isCentral ? districts.filter((d) => d.id !== assignedId).map((d) => d.code) : [], [assignedId, districts, isCentral, user])

  useEffect(() => { api.districts.list().then(setDistricts).catch(() => setError('Peta kabupaten/kota tidak dapat dimuat.')).finally(() => setLoading(false)); api.districts.publicSummary().then(setStats).catch(() => {}).finally(() => setStatsLoading(false)) }, [])
  useEffect(() => { if (stats.athletes <= 0) { setAnimatedAthletes(0); return } const duration = 900; const started = performance.now(); let frame = 0; const tick = (now: number) => { const progress = Math.min((now - started) / duration, 1); setAnimatedAthletes(Math.round(stats.athletes * (1 - Math.pow(1 - progress, 3)))); if (progress < 1) frame = requestAnimationFrame(tick) }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame) }, [stats.athletes])
  const detail = (district: District) => navigate(`/districts/${district.id}`)
  const manage = (district: District) => { if (!user) { navigate('/signin', { state: { from: '/', intentDistrictId: district.id } }); return }; if (!isCentral && district.id !== assignedId) return; selectWorkspace(district); navigate('/dashboard') }
  const doubleClick = (district: District) => { if (!user) { detail(district); return }; manage(district) }

  return <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header className="sticky top-0 z-40 bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <svg className="h-10 w-10 fill-violet-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-label="PELTI Bali One"><path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" /></svg>
          <span className="text-xl font-bold uppercase tracking-[0.16em] text-gray-800 dark:text-gray-100">PELTI Bali One</span>
        </div>
        {user ? <div className="flex items-center gap-3"><span className="text-sm font-medium text-green-700">Admin aktif</span>{isCentral && <button className="btn border border-gray-300 bg-white px-4 text-sm text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700" onClick={() => { selectAllRegions(); navigate('/dashboard/all-regions') }}>Semua Wilayah</button>}</div> : <button className="btn bg-gray-900 px-4 text-sm text-white hover:bg-gray-800" onClick={() => navigate('/signin')}>Sign in</button>}
      </div>
    </header>
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col justify-center px-5 py-10 sm:px-6 lg:px-8">
      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading ? <div className="p-10 text-center text-sm text-gray-500">Memuat peta kabupaten/kota…</div> : districts.length > 0 && <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_260px]"><BaliDistrictMap districts={districts} disabledCodes={disabledCodes} onDetail={detail} onManage={manage} onDoubleClick={doubleClick} /><aside className="grid grid-cols-2 gap-x-8 gap-y-9 lg:grid-cols-1 lg:gap-y-10" aria-label="Statistik Pelti Bali"><StatCard label="Atlet" value={animatedAthletes} active={!statsLoading} /><StatCard label="Pelatih" value={stats.coaches} active={!statsLoading} /><StatCard label="Satpras" value={stats.facilities} active={!statsLoading} /><StatCard label="Wasit" value={stats.referees} active={!statsLoading} /></aside></div>}
      <p className="mt-auto pt-10 text-left text-xs text-gray-400">Pilih wilayah untuk melihat overview pemain atau masuk ke workspace pengelolaan.</p>
    </div>
  </main>
}
