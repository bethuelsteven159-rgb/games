import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { loginUser } from '../lib/auth.js'
import { normalizeError } from '../lib/utils.js'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [form, setForm] = useState({
    username: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await loginUser(form)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (submitError) {
      setError(normalizeError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Welcome back</p>
        <h1>Log in and pick your next duel.</h1>
        <p className="muted-copy">
          Use your username and password. No public email address is required on
          the interface.
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="feedback feedback--error">{error}</p>}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="inline-note">
          Need an account? <Link to="/register">Register here</Link>.
        </p>
      </section>
    </main>
  )
}

export default LoginPage
