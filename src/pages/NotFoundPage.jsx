import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">404</p>
        <h1>This room does not exist.</h1>
        <p className="muted-copy">
          The page you tried to reach is not part of the current duel board.
        </p>
        <Link className="button" to="/dashboard">
          Back to dashboard
        </Link>
      </section>
    </main>
  )
}

export default NotFoundPage
