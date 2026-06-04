import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { isSupabaseConfigured } from './lib/supabase.js'
import ChallengesPage from './pages/ChallengesPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import GameRoomPage from './pages/GameRoomPage.jsx'
import GamesPage from './pages/GamesPage.jsx'
import HeadToHeadPage from './pages/HeadToHeadPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import SetupPage from './pages/SetupPage.jsx'

function App() {
  if (!isSupabaseConfigured) {
    return <SetupPage />
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/challenges" element={<ChallengesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/game/:gameId" element={<GameRoomPage />} />
              <Route
                path="/head-to-head/:playerId"
                element={<HeadToHeadPage />}
              />
            </Route>
          </Route>

          <Route path="/home" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
