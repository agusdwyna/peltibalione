import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './css/style.css'
import './charts/ChartjsConfig'
import AppShell from './components/layout/AppShell'
import Dashboard from './modules/dashboard'
import LandingMapPage from './pages/LandingMapPage'
import PublicDistrictOverviewPage from './pages/PublicDistrictOverviewPage'
import PlayersPage from './modules/players/PlayersPage'
import PlayerDetailPage from './modules/players/PlayerDetailPage'
import PlayerSubmissionPage from './modules/players/PlayerSubmissionPage'
import FormsPage from './modules/forms/FormsPage'
import VerificationPage from './modules/verification/VerificationPage'
import VerificationDetailPage from './modules/verification/VerificationDetailPage'
import UsersPage from './modules/users/UsersPage'
import AuditLogPage from './modules/audit-log/AuditLogPage'
import SignIn from './pages/SignIn'
import PublicFormPage from './pages/PublicFormPage'
import CheckStatusPage from './pages/CheckStatusPage'
import NotFound from './pages/NotFound'
import { AuthBootstrap, CentralOnlyRoute, ProtectedRoute, PublicOnlyRoute, WorkspaceRoute } from './routes/guards'
import { useAuthStore } from './stores/auth.store'

function PlaceholderPage({ title }: { title: string }) {
  return <div className="px-4 py-8 sm:px-6 lg:px-8"><h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h1><div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500 shadow-xs">Module workspace siap dihubungkan ke API.</div></div>
}

function App() {
  const location = useLocation()
  const bootstrap = useAuthStore((state) => state.bootstrap)
  useEffect(() => { void bootstrap() }, [bootstrap])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [location.pathname])

  return <Routes>
    <Route element={<AuthBootstrap />}>
      <Route element={<PublicOnlyRoute />}><Route path="/signin" element={<SignIn />} /></Route>
      <Route element={<WorkspaceRoute />}><Route path="/workspaces" element={<Navigate to="/" replace />} /></Route>
      <Route path="/" element={<LandingMapPage />} />
      <Route path="/districts/:districtId" element={<PublicDistrictOverviewPage />} />
      <Route path="/form/player/:token" element={<PublicFormPage />} />
      <Route path="/check-status" element={<CheckStatusPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route element={<CentralOnlyRoute />}>
            <Route path="/dashboard/all-regions" element={<Dashboard />} />
          </Route>
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/players/new" element={<PlayerSubmissionPage />} />
          <Route path="/players/:playerId" element={<PlayerDetailPage />} />
          <Route path="/clubs" element={<PlaceholderPage title="Klub" />} />
          <Route path="/forms" element={<FormsPage />} />
          <Route path="/submissions" element={<PlaceholderPage title="Pengajuan" />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/verification/:submissionId" element={<VerificationDetailPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Route>
  </Routes>
}

export default App
