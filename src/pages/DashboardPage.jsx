import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getDashboardData,
  listenToDashboard,
  markNotificationRead,
} from '../lib/api.js'
import {
  buildProfileLink,
  formatDateTime,
  formatWinRate,
  getDisplayName,
  getOpponent,
  getStatusLabel,
  isMyTurn,
  normalizeError,
} from '../lib/utils.js'

function DashboardPage() {
  const { profile, user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const refreshDashboard = useEffectEvent(async () => {
    try {
      const data = await getDashboardData()

      startTransition(() => {
        setDashboard(data)
        setError('')
      })
    } catch (loadError) {
      startTransition(() => {
        setError(normalizeError(loadError))
      })
    } finally {
      startTransition(() => {
        setIsLoading(false)
      })
    }
  })

  useEffect(() => {
    if (!user) {
      return undefined
    }

    void refreshDashboard()

    const unsubscribe = listenToDashboard(user.id, () => {
      void refreshDashboard()
    })

    return unsubscribe
  }, [refreshDashboard, user])

  if (isLoading) {
    return <LoadingScreen message="Pulling your active games..." />
  }

  const games = dashboard?.games ?? []
  const activeGames = games.filter(
    (game) => game.status === 'setup' || game.status === 'active',
  )
  const recentMatches = games.filter((game) => game.status === 'completed')
  const incomingPending =
    dashboard?.challenges?.incoming?.filter(
      (challenge) => challenge.status === 'pending',
    ) ?? []
  const outgoingPending =
    dashboard?.challenges?.outgoing?.filter(
      (challenge) => challenge.status === 'pending',
    ) ?? []

  const handleMarkRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId)
      await refreshDashboard()
    } catch (markError) {
      setError(normalizeError(markError))
    }
  }

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Command center</p>
          <h2>Welcome back, {getDisplayName(profile)}.</h2>
        </div>

        <div className="stat-row">
          <article className="stat-card">
            <span>Record</span>
            <strong>
              {profile?.wins ?? 0}-{profile?.losses ?? 0}
            </strong>
          </article>

          <article className="stat-card">
            <span>Win rate</span>
            <strong>{formatWinRate(profile?.wins, profile?.losses)}</strong>
          </article>

          <article className="stat-card">
            <span>Pending inbox</span>
            <strong>{incomingPending.length}</strong>
          </article>
        </div>
      </div>

      {error && <p className="feedback feedback--error">{error}</p>}

      <div className="content-grid content-grid--dashboard">
        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Live board</p>
              <h3>Active games</h3>
            </div>

            <Link className="text-link" to="/games">
              Browse modes
            </Link>
          </div>

          {activeGames.length ? (
            <div className="stack-list">
              {activeGames.slice(0, 4).map((game) => {
                const opponent = getOpponent(game, user.id)

                return (
                  <article key={game.id} className="surface-card surface-card--game">
                    <div className="surface-card__meta">
                      <span className="badge">
                        {getStatusLabel(game.status)}
                      </span>
                      {isMyTurn(game, user.id) && (
                        <span className="badge badge--warm">Your turn</span>
                      )}
                    </div>

                    <div className="surface-card__body">
                      <div>
                        <h4>{getDisplayName(opponent)}</h4>
                        <p>
                          {game.digit_length} digits
                          {game.allow_repeats ? ' with repeats' : ' without repeats'}
                        </p>
                      </div>

                      <Link className="button button--small" to={`/game/${game.id}`}>
                        Open room
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="empty-panel">
              <p>No live matches yet.</p>
              <Link className="button button--small" to="/search">
                Find players
              </Link>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Matchmaking</p>
              <h3>Pending challenges</h3>
            </div>

            <Link className="text-link" to="/challenges">
              Open inbox
            </Link>
          </div>

          <div className="mini-grid">
            <article className="surface-card">
              <p>Incoming</p>
              <strong>{incomingPending.length}</strong>
            </article>

            <article className="surface-card">
              <p>Outgoing</p>
              <strong>{outgoingPending.length}</strong>
            </article>
          </div>

          <div className="stack-list">
            {incomingPending.slice(0, 3).map((challenge) => (
              <article key={challenge.id} className="surface-card">
                <div className="surface-card__body">
                  <div>
                    <h4>{getDisplayName(challenge.challenger)}</h4>
                    <p>
                      {challenge.digit_length} digits
                      {challenge.allow_repeats
                        ? ' with repeats'
                        : ' without repeats'}
                    </p>
                  </div>

                  <Link className="button button--small" to="/challenges">
                    Review
                  </Link>
                </div>
              </article>
            ))}

            {!incomingPending.length && (
              <p className="muted-copy">Your inbox is clear right now.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Signals</p>
              <h3>Notifications</h3>
            </div>
          </div>

          <div className="stack-list">
            {(dashboard?.notifications ?? []).map((notification) => (
              <article key={notification.id} className="surface-card">
                <div className="surface-card__body surface-card__body--top">
                  <div>
                    <h4>{notification.message}</h4>
                    <p>{formatDateTime(notification.created_at)}</p>
                  </div>

                  {!notification.read_at && (
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => handleMarkRead(notification.id)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </article>
            ))}

            {!dashboard?.notifications?.length && (
              <p className="muted-copy">Notifications will land here as games move.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Recent results</p>
              <h3>Completed matches</h3>
            </div>
          </div>

          {recentMatches.length ? (
            <div className="stack-list">
              {recentMatches.slice(0, 4).map((game) => {
                const opponent = getOpponent(game, user.id)
                const didWin = game.winner_id === user.id

                return (
                  <article key={game.id} className="surface-card">
                    <div className="surface-card__body">
                      <div>
                        <h4>{didWin ? 'Victory' : 'Defeat'}</h4>
                        <p>
                          vs {getDisplayName(opponent)} on{' '}
                          {formatDateTime(game.completed_at)}
                        </p>
                      </div>

                      <Link
                        className="text-link"
                        to={buildProfileLink(opponent.id)}
                      >
                        Head-to-head
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="muted-copy">
              Completed games will show up here once your first duel is over.
            </p>
          )}
        </section>
      </div>
    </section>
  )
}

export default DashboardPage
