import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function LandingPage() {
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="marketing-shell">
      <section className="hero-card">
        <div className="hero-copy-block">
          <p className="eyebrow">Two-player deduction, redesigned</p>
          <h1>Digit Duel turns number guessing into a tense, social battle.</h1>
          <p className="hero-copy">
            Challenge friends, lock in a secret code, and trade guesses until
            someone cracks every digit. Built for Supabase auth, realtime
            updates, head-to-head stats, and clean turn-based play.
          </p>

          <div className="hero-actions">
            <Link className="button" to="/register">
              Create account
            </Link>
            <Link className="button button--ghost" to="/login">
              Log in
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel__top">
            <span className="badge badge--warm">Live challenge flow</span>
            <span className="badge badge--soft">4, 5, or 6 digits</span>
          </div>

          <div className="score-stack">
            <article className="score-card">
              <p>Secret number</p>
              <strong>5 8 3 1</strong>
              <span>Hidden until the final whistle</span>
            </article>

            <article className="score-card">
              <p>Guess</p>
              <strong>3 1 8 9</strong>
              <span>3 digits matched</span>
            </article>

            <article className="score-card score-card--accent">
              <p>Victory condition</p>
              <strong>Match all digits</strong>
              <span>First player to solve wins</span>
            </article>
          </div>
        </div>
      </section>

      <section className="callout-grid">
        <article className="callout-card">
          <h2>Username-first auth</h2>
          <p>
            Players register with a username and password while Supabase handles
            secure auth behind the scenes.
          </p>
        </article>

        <article className="callout-card">
          <h2>Clean challenge loop</h2>
          <p>
            Search players, send a challenge, accept or decline, then move
            straight into the shared game room.
          </p>
        </article>

        <article className="callout-card">
          <h2>Realtime momentum</h2>
          <p>
            New guesses, comments, and match outcomes flow back into the UI so
            games never feel stale.
          </p>
        </article>
      </section>
    </main>
  )
}

export default LandingPage
