import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  acceptChallenge,
  cancelChallenge,
  declineChallenge,
  listChallenges,
  listenToDashboard,
} from '../lib/api.js'
import {
  formatDateTime,
  getDisplayName,
  normalizeError,
} from '../lib/utils.js'

function ChallengesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [challenges, setChallenges] = useState({
    incoming: [],
    outgoing: [],
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState('')

  const refreshChallenges = useEffectEvent(async () => {
    try {
      const data = await listChallenges()

      startTransition(() => {
        setChallenges(data)
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

    void refreshChallenges()

    const unsubscribe = listenToDashboard(user.id, () => {
      void refreshChallenges()
    })

    return unsubscribe
  }, [refreshChallenges, user])

  const withBusyState = async (challengeId, action) => {
    setBusyId(challengeId)
    setError('')

    try {
      await action()
      await refreshChallenges()
    } catch (actionError) {
      setError(normalizeError(actionError))
    } finally {
      setBusyId('')
    }
  }

  const handleAccept = (challengeId) =>
    withBusyState(challengeId, async () => {
      const gameId = await acceptChallenge(challengeId)
      navigate(`/game/${gameId}`)
    })

  const handleDecline = (challengeId) =>
    withBusyState(challengeId, () => declineChallenge(challengeId))

  const handleCancel = (challengeId) =>
    withBusyState(challengeId, () => cancelChallenge(challengeId))

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Inbox</p>
          <h2>Incoming and outgoing challenges</h2>
        </div>

        <Link className="button button--ghost button--small" to="/search">
          New challenge
        </Link>
      </div>

      {error && <p className="feedback feedback--error">{error}</p>}

      {isLoading ? (
        <p className="muted-copy">Loading challenge traffic...</p>
      ) : (
        <div className="two-column-grid">
          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Incoming</p>
                <h3>Challenges for you</h3>
              </div>
            </div>

            <div className="stack-list">
              {challenges.incoming.map((challenge) => (
                <article key={challenge.id} className="surface-card">
                  <div className="surface-card__body surface-card__body--stack">
                    <div>
                      <h4>{getDisplayName(challenge.challenger)}</h4>
                      <p>
                        {challenge.digit_length} digits
                        {challenge.allow_repeats
                          ? ' with repeats'
                          : ' without repeats'}
                      </p>
                      <p>{challenge.message || 'No message attached.'}</p>
                      <p>Sent {formatDateTime(challenge.created_at)}</p>
                    </div>

                    {challenge.status === 'pending' ? (
                      <div className="button-row">
                        <button
                          type="button"
                          className="button button--small"
                          onClick={() => handleAccept(challenge.id)}
                          disabled={busyId === challenge.id}
                        >
                          Accept
                        </button>

                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() => handleDecline(challenge.id)}
                          disabled={busyId === challenge.id}
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <p className="badge">{challenge.status}</p>
                    )}
                  </div>
                </article>
              ))}

              {!challenges.incoming.length && (
                <p className="muted-copy">No incoming challenges yet.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Outgoing</p>
                <h3>Challenges you sent</h3>
              </div>
            </div>

            <div className="stack-list">
              {challenges.outgoing.map((challenge) => (
                <article key={challenge.id} className="surface-card">
                  <div className="surface-card__body surface-card__body--stack">
                    <div>
                      <h4>{getDisplayName(challenge.challenged)}</h4>
                      <p>
                        {challenge.digit_length} digits
                        {challenge.allow_repeats
                          ? ' with repeats'
                          : ' without repeats'}
                      </p>
                      <p>{challenge.message || 'No message attached.'}</p>
                      <p>Sent {formatDateTime(challenge.created_at)}</p>
                    </div>

                    {challenge.status === 'pending' ? (
                      <button
                        type="button"
                        className="button button--ghost button--small"
                        onClick={() => handleCancel(challenge.id)}
                        disabled={busyId === challenge.id}
                      >
                        Cancel
                      </button>
                    ) : challenge.game?.id ? (
                      <Link
                        className="button button--small"
                        to={`/game/${challenge.game.id}`}
                      >
                        Open game
                      </Link>
                    ) : (
                      <p className="badge">{challenge.status}</p>
                    )}
                  </div>
                </article>
              ))}

              {!challenges.outgoing.length && (
                <p className="muted-copy">You have not sent any challenges yet.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default ChallengesPage
