import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import LoadingScreen from './LoadingScreen.jsx'

function ProtectedRoute() {
  const { isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export default ProtectedRoute
