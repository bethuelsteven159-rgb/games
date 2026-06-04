import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { registerUser, USERNAME_PATTERN } from '../lib/auth.js'
import { normalizeError } from '../lib/utils.js'

function RegisterPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
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
    setError('')
    setNotice('')

    if (!USERNAME_PATTERN.test(form.username.trim())) {
      setError(
        'Username must be 3-20 characters and use only letters, numbers, or underscores.',
      )
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await registerUser(form)

      if (result.session) {
        navigate('/dashboard', { replace: true })
        return
      }

      setNotice(
        'Account created, but email confirmation is still enabled in Supabase Auth. Disable confirm-email for username-only sign-in and try again.',
      )
    } catch (submitError) {
      setError(normalizeError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Create your account</p>
        <h1>Build a profile and start sending challenges.</h1>
        <p className="muted-copy">
          Usernames stay front and center while Supabase manages auth in the
          background.
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
            <span>Display name</span>
            <input
              name="displayName"
              value={form.displayName}
              onChange={handleChange}
              autoComplete="nickname"
              placeholder="Optional"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </label>

          {error && <p className="feedback feedback--error">{error}</p>}
          {notice && <p className="feedback feedback--success">{notice}</p>}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="inline-note">
          Already registered? <Link to="/login">Log in instead</Link>.
        </p>
      </section>
    </main>
  )
}

export default RegisterPage
