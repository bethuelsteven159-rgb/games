import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { logoutUser } from '../lib/auth.js'
import { getDisplayName, getInitials, normalizeError } from '../lib/utils.js'

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Games', to: '/games' },
  { label: 'Search', to: '/search' },
  { label: 'Challenges', to: '/challenges' },
  { label: 'Profile', to: '/profile' },
]

function AppLayout() {
  const navigate = useNavigate()
  const { error: authError, profile } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setLogoutError('')

    try {
      await logoutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(normalizeError(error))
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Digit Duel</p>
          <h1 className="app-title">Challenge. Conceal. Count. Win.</h1>
        </div>

        <div className="app-header__meta">
          <div className="player-chip">
            {profile?.avatar_url ? (
              <img
                className="avatar"
                src={profile.avatar_url}
                alt={`${getDisplayName(profile)} avatar`}
              />
            ) : (
              <span className="avatar avatar--fallback">
                {getInitials(profile)}
              </span>
            )}

            <div>
              <strong>{getDisplayName(profile)}</strong>
              <p>@{profile?.username ?? 'loading'}</p>
            </div>
          </div>

          <button
            type="button"
            className="button button--ghost"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </header>

      <nav className="app-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-link${isActive ? ' nav-link--active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {(authError || logoutError) && (
        <p className="feedback feedback--error">{authError || logoutError}</p>
      )}

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
