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
import FacilitiesPage from './modules/facilities/FacilitiesPage'
import FacilityDetailPage from './modules/facilities/FacilityDetailPage'
import FacilityReviewPage from './modules/facilities/FacilityReviewPage'
import FacilityReviewDetailPage from './modules/facilities/FacilityReviewDetailPage'
import FacilitySubmissionPage from './modules/facilities/FacilitySubmissionPage'
import CoachesPage from './modules/coaches/CoachesPage'
import CoachDetailPage from './modules/coaches/CoachDetailPage'
import CoachReviewPage from './modules/coaches/CoachReviewPage'
import CoachReviewDetailPage from './modules/coaches/CoachReviewDetailPage'
import CoachSubmissionPage from './modules/coaches/CoachSubmissionPage'
import OfficialsPage from './modules/officials/OfficialsPage'
import OfficialDetailPage from './modules/officials/OfficialDetailPage'
import OfficialReviewPage from './modules/officials/OfficialReviewPage'
import OfficialReviewDetailPage from './modules/officials/OfficialReviewDetailPage'
import OfficialSubmissionPage from './modules/officials/OfficialSubmissionPage'
import VerificationPage from './modules/verification/VerificationPage'
import VerificationDetailPage from './modules/verification/VerificationDetailPage'
import UsersPage from './modules/users/UsersPage'
import AuditLogPage from './modules/audit-log/AuditLogPage'
import SignIn from './pages/SignIn'
import PublicFormPage from './pages/PublicFormPage'
import PublicFacilityFormPage from './pages/PublicFacilityFormPage'
import PublicCoachFormPage from './pages/PublicCoachFormPage'
import PublicOfficialFormPage from './pages/PublicOfficialFormPage'
import CheckStatusPage from './pages/CheckStatusPage'
import PublicPlayerDetailPage from './pages/PublicPlayerDetailPage'
import PublicCoachDetailPage from './pages/PublicCoachDetailPage'
import PublicOfficialDetailPage from './pages/PublicOfficialDetailPage'
import PublicFacilityDetailPage from './pages/PublicFacilityDetailPage'
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
      {/* Tidak ada halaman pemilih workspace terpisah — berganti wilayah
          dilakukan dari peta: klik wilayahnya, atau buka beranda. */}
      <Route element={<WorkspaceRoute />}><Route path="/workspaces" element={<Navigate to="/" replace />} /></Route>
      <Route path="/" element={<LandingMapPage />} />
      <Route path="/districts/:districtId" element={<PublicDistrictOverviewPage />} />
      {/* Tanpa token: form memang belum dibuka — halaman form sendiri yang
          menjelaskan keadaannya dengan pesan yang sopan. */}
      <Route path="/form/player" element={<PublicFormPage />} />
      <Route path="/form/facility" element={<PublicFacilityFormPage />} />
      <Route path="/form/coach" element={<PublicCoachFormPage />} />
      <Route path="/form/official" element={<PublicOfficialFormPage />} />
      <Route path="/form/player/:token" element={<PublicFormPage />} />
      <Route path="/form/facility/:token" element={<PublicFacilityFormPage />} />
      <Route path="/form/coach/:token" element={<PublicCoachFormPage />} />
      <Route path="/form/official/:token" element={<PublicOfficialFormPage />} />
      <Route path="/check-status" element={<CheckStatusPage />} />
      {/* Detail publik memakai rute berbahasa Indonesia dan kode resmi sebagai
          kunci, supaya tidak mungkin bertabrakan dengan rute admin
          (/players/:playerId dan sejenisnya) yang butuh login. */}
      <Route path="/pemain/:code" element={<PublicPlayerDetailPage />} />
      <Route path="/pelatih/:code" element={<PublicCoachDetailPage />} />
      <Route path="/wasit/:code" element={<PublicOfficialDetailPage />} />
      <Route path="/lapangan/:code" element={<PublicFacilityDetailPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route element={<CentralOnlyRoute />}>
            <Route path="/dashboard/all-regions" element={<Dashboard />} />
          </Route>
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/players/new" element={<PlayerSubmissionPage />} />
          <Route path="/players/:playerId" element={<PlayerDetailPage />} />
          <Route path="/facilities" element={<FacilitiesPage />} />
          <Route path="/facilities/new" element={<FacilitySubmissionPage />} />
          <Route path="/facilities/review" element={<FacilityReviewPage />} />
          <Route path="/facilities/review/:submissionId" element={<FacilityReviewDetailPage />} />
          <Route path="/facilities/:facilityId" element={<FacilityDetailPage />} />
          <Route path="/coaches" element={<CoachesPage />} />
          <Route path="/coaches/new" element={<CoachSubmissionPage />} />
          <Route path="/coaches/review" element={<CoachReviewPage />} />
          <Route path="/coaches/review/:submissionId" element={<CoachReviewDetailPage />} />
          <Route path="/coaches/:coachId" element={<CoachDetailPage />} />
          <Route path="/officials" element={<OfficialsPage />} />
          <Route path="/officials/new" element={<OfficialSubmissionPage />} />
          <Route path="/officials/review" element={<OfficialReviewPage />} />
          <Route path="/officials/review/:submissionId" element={<OfficialReviewDetailPage />} />
          <Route path="/officials/:officialId" element={<OfficialDetailPage />} />
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
