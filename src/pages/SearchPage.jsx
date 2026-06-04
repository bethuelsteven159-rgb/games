import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { searchPlayers, sendChallenge } from '../lib/api.js'
import {
  DIGIT_LENGTH_OPTIONS,
  formatWinRate,
  getDisplayName,
  normalizeError,
} from '../lib/utils.js'

const defaultDraft = {
  digitLength: 4,
  allowRepeats: false,
  message: '',
}

function SearchPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [openComposer, setOpenComposer] = useState('')
  const [draft, setDraft] = useState(defaultDraft)
  const [isSending, setIsSending] = useState(false)
  const [success, setSuccess] = useState('')
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    let isMounted = true

    const runSearch = async () => {
      setIsLoading(true)

      try {
        const result = await searchPlayers(deferredQuery)

        if (!isMounted) {
          return
        }

        startTransition(() => {
          setPlayers(result.filter((player) => player.id !== user.id))
          setError('')
        })
      } catch (searchError) {
        if (!isMounted) {
          return
        }

        startTransition(() => {
          setError(normalizeError(searchError))
        })
      } finally {
        if (isMounted) {
          startTransition(() => {
            setIsLoading(false)
          })
        }
      }
    }

    void runSearch()

    return () => {
      isMounted = false
    }
  }, [deferredQuery, user.id])

  const handleChallenge = async (event, playerId) => {
    event.preventDefault()
    setIsSending(true)
    setError('')
    setSuccess('')

    try {
      await sendChallenge({
        challengedId: playerId,
        digitLength: Number(draft.digitLength),
        allowRepeats: draft.allowRepeats,
        message: draft.message.trim(),
      })

      setSuccess('Challenge sent successfully.')
      setOpenComposer('')
      setDraft(defaultDraft)
    } catch (challengeError) {
      setError(normalizeError(challengeError))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Player search</p>
          <h2>Find your next rival.</h2>
        </div>
      </div>

      <section className="panel">
        <label className="field">
          <span>Search by username or display name</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a username..."
          />
        </label>

        {error && <p className="feedback feedback--error">{error}</p>}
        {success && <p className="feedback feedback--success">{success}</p>}

        {isLoading ? (
          <p className="muted-copy">Searching the arena...</p>
        ) : (
          <div className="stack-list">
            {players.map((player) => {
              const isComposerOpen = openComposer === player.id

              return (
                <article key={player.id} className="surface-card surface-card--player">
                  <div className="surface-card__body surface-card__body--stack">
                    <div>
                      <h3>{getDisplayName(player)}</h3>
                      <p>@{player.username}</p>
                      <p>
                        Record {player.wins}-{player.losses} · Win rate{' '}
                        {formatWinRate(player.wins, player.losses)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="button button--small"
                      onClick={() =>
                        setOpenComposer((current) =>
                          current === player.id ? '' : player.id,
                        )
                      }
                    >
                      {isComposerOpen ? 'Close' : 'Challenge'}
                    </button>
                  </div>

                  {isComposerOpen && (
                    <form
                      className="challenge-form"
                      onSubmit={(event) => handleChallenge(event, player.id)}
                    >
                      <div className="field-row">
                        <label className="field">
                          <span>Digit length</span>
                          <select
                            value={draft.digitLength}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                digitLength: event.target.value,
                              }))
                            }
                          >
                            {DIGIT_LENGTH_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={draft.allowRepeats}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                allowRepeats: event.target.checked,
                              }))
                            }
                          />
                          <span>Allow repeated digits</span>
                        </label>
                      </div>

                      <label className="field">
                        <span>Optional message</span>
                        <textarea
                          value={draft.message}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              message: event.target.value,
                            }))
                          }
                          rows={3}
                          placeholder="Ready for a duel?"
                        />
                      </label>

                      <button
                        type="submit"
                        className="button button--small"
                        disabled={isSending}
                      >
                        {isSending ? 'Sending...' : 'Send challenge'}
                      </button>
                    </form>
                  )}
                </article>
              )
            })}

            {!players.length && (
              <p className="muted-copy">
                No players matched that search yet. Try a different username or
                display name.
              </p>
            )}
          </div>
        )}
      </section>
    </section>
  )
}

export default SearchPage
