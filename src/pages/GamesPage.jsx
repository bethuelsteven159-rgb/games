import { Link } from 'react-router-dom'

function GamesPage() {
  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Mode select</p>
          <h2>Choose how you want to battle.</h2>
        </div>
      </div>

      <div className="game-grid">
        <article className="game-card">
          <div className="game-card__visual">
            <span className="badge badge--warm">Live now</span>
            <strong>Number Duel</strong>
          </div>

          <div className="game-card__copy">
            <h3>Secret-code showdown</h3>
            <p>
              Two players each choose a hidden 4, 5, or 6-digit number. Trade
              guesses, count matching digits, and solve the full set before your
              opponent does.
            </p>

            <ul className="feature-list">
              <li>2 players per room</li>
              <li>Turn-based guessing with server-side validation</li>
              <li>Realtime updates for guesses, comments, and results</li>
            </ul>

            <Link className="button" to="/search">
              Find an opponent
            </Link>
          </div>
        </article>

        <article className="game-card game-card--muted">
          <div className="game-card__copy">
            <h3>More modes later</h3>
            <p>
              The schema is already structured for multiple game types, so this
              section is ready for future additions like tournaments or
              repeat-digit variants.
            </p>
          </div>
        </article>
      </div>
    </section>
  )
}

export default GamesPage
