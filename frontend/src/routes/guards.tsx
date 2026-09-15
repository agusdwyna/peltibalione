import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import { useWorkspaceStore } from '../stores/workspace.store'
import Forbidden from '../pages/Forbidden'

export function AuthBootstrap() {
  const status = useAuthStore((state) => state.status)
  if (status === 'loading') return <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm text-gray-500">Loading session…</div>
  return <Outlet />
}

export function PublicOnlyRoute() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  if (status === 'loading') return <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm text-gray-500">Loading session…</div>
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <Outlet />
}

export function WorkspaceRoute() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const selectWorkspace = useWorkspaceStore((state) => state.selectWorkspace)
  const districtId = user?.roles.find((role) => role.role === 'DISTRICT_ADMIN')?.districtId
  const isCentral = user?.roles.some((role) => role.role === 'CENTRAL_ADMIN') ?? false
  const storedWorkspace = workspace

  useEffect(() => {
    if (status !== 'authenticated' || isCentral || !districtId || storedWorkspace?.id === districtId) return
    void api.districts.list().then((districts) => {
      const assigned = districts.find((district) => district.id === districtId)
      if (assigned) selectWorkspace(assigned)
    })
  }, [districtId, isCentral, selectWorkspace, status, storedWorkspace?.id])

  if (status === 'loading') return <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm text-gray-500">Loading session…</div>
  if (status !== 'authenticated' || !user) return <Navigate to="/signin" replace />
  if (!isCentral && districtId && storedWorkspace?.id !== districtId) return <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm text-gray-500">Loading workspace…</div>
  return <Outlet />
}

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace)
  const isAllRegions = useWorkspaceStore((state) => state.isAllRegions)
  const location = useLocation()
  if (status === 'loading') return <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm text-gray-500">Loading session…</div>
  if (status !== 'authenticated' || !user) return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  if (!user.roles.length) return <Forbidden />
  const isCentral = user.roles.some((role) => role.role === 'CENTRAL_ADMIN')
  const districtRole = user.roles.find((role) => role.role === 'DISTRICT_ADMIN')
  const isAllRegionsDashboard = location.pathname === '/dashboard/all-regions'
  const isCentralSystemPage = isCentral && (location.pathname === '/users' || location.pathname === '/audit-log')
  if (user.roles.every((role) => role.role === 'PLAYER')) return <Forbidden />
  if (isCentral && !workspace && !isAllRegions && !isAllRegionsDashboard && !isCentralSystemPage) return <Navigate to="/" replace />
  if (!isCentral && districtRole?.districtId && workspace?.id !== districtRole.districtId) return <Navigate to="/" replace />
  return <Outlet />
}

export function CentralOnlyRoute() {
  const user = useAuthStore((state) => state.user)
  return user?.roles.some((role) => role.role === 'CENTRAL_ADMIN') ? <Outlet /> : <Forbidden />
}
