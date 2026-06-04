import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from 'react'
import { Link, useParams } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  addComment,
  getGame,
  listenToGame,
  makeGuess,
  submitSecret,
} from '../lib/api.js'
import {
  buildProfileLink,
  formatDateTime,
  getDisplayName,
  getOpponent,
  getStatusLabel,
  isMyTurn,
  normalizeError,
  validateDigitCode,
} from '../lib/utils.js'

function GameRoomPage() {
  const { gameId } = useParams()
  const { user } = useAuth()
  const [game, setGame] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [secretDraft, setSecretDraft] = useState('')
  const [guessDraft, setGuessDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [success, setSuccess] = useState('')

  const refreshGame = useEffectEvent(async () => {
    try {
      const data = await getGame(gameId)

      startTransition(() => {
        setGame(data)
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
    if (!gameId) {
      return undefined
    }

    void refreshGame()

    const unsubscribe = listenToGame(gameId, () => {
      void refreshGame()
    })

    return unsubscribe
  }, [gameId, refreshGame])

  if (isLoading) {
    return <LoadingScreen message="Entering the game room..." />
  }

  if (!game) {
    return (
      <section className="panel">
        <p className="feedback feedback--error">
          {error || 'Game not found.'}
        </p>
      </section>
    )
  }

  const opponent = getOpponent(game, user.id)
  const mySecret = game.game_secrets.find((secret) => secret.player_id === user.id)
  const canGuess = game.status === 'active' && isMyTurn(game, user.id)
  const winnerName =
    game.winner_id === user.id ? 'You' : getDisplayName(opponent)

  const handleSecretSubmit = async (event) => {
    event.preventDefault()
    const validationError = validateDigitCode(
      secretDraft,
      game.digit_length,
      game.allow_repeats,
    )

    if (validationError) {
      setError(validationError)
      return
    }

    setBusyAction('secret')
    setError('')
    setSuccess('')

    try {
      await submitSecret(game.id, secretDraft.trim())
      setSecretDraft('')
      setSuccess('Secret number submitted.')
      await refreshGame()
    } catch (submitError) {
      setError(normalizeError(submitError))
    } finally {
      setBusyAction('')
    }
  }

  const handleGuessSubmit = async (event) => {
    event.preventDefault()
    const validationError = validateDigitCode(
      guessDraft,
      game.digit_length,
      game.allow_repeats,
    )

    if (validationError) {
      setError(validationError)
      return
    }

    setBusyAction('guess')
    setError('')
    setSuccess('')

    try {
      await makeGuess(game.id, guessDraft.trim())
      setGuessDraft('')
      setSuccess('Guess sent.')
      await refreshGame()
    } catch (guessError) {
      setError(normalizeError(guessError))
    } finally {
      setBusyAction('')
    }
  }

  const handleCommentSubmit = async (event) => {
    event.preventDefault()

    if (!commentDraft.trim()) {
      setError('Comment cannot be empty.')
      return
    }

    setBusyAction('comment')
    setError('')
    setSuccess('')

    try {
      await addComment({
        gameId: game.id,
        content: commentDraft.trim(),
      })
      setCommentDraft('')
      setSuccess('Comment posted.')
      await refreshGame()
    } catch (commentError) {
      setError(normalizeError(commentError))
    } finally {
      setBusyAction('')
    }
  }

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Game room</p>
          <h2>
            You vs {getDisplayName(opponent)}
          </h2>
        </div>

        <Link className="text-link" to={buildProfileLink(opponent.id)}>
          Head-to-head
        </Link>
      </div>

      {error && <p className="feedback feedback--error">{error}</p>}
      {success && <p className="feedback feedback--success">{success}</p>}

      <div className="content-grid content-grid--game-room">
        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Match state</p>
              <h3>{getStatusLabel(game.status)}</h3>
            </div>

            <div className="surface-card surface-card--compact">
              <p>
                {game.digit_length} digits
                {game.allow_repeats ? ' with repeats' : ' without repeats'}
              </p>
              <strong>
                {game.status === 'completed'
                  ? `${winnerName} won`
                  : canGuess
                    ? 'Your turn'
                    : 'Waiting on the board'}
              </strong>
            </div>
          </div>

          <div className="mini-grid">
            <article className="surface-card">
              <p>Created</p>
              <strong>{formatDateTime(game.created_at)}</strong>
            </article>

            <article className="surface-card">
              <p>Started</p>
              <strong>{formatDateTime(game.started_at)}</strong>
            </article>
          </div>

          {game.status === 'setup' && (
            <form className="form-grid" onSubmit={handleSecretSubmit}>
              <div className="surface-card">
                <h4>Secret number</h4>
                <p>
                  {mySecret
                    ? 'Your secret is locked in. The game will start once both players submit.'
                    : 'Choose your hidden number. It stays private until the game ends.'}
                </p>
              </div>

              {!mySecret && (
                <>
                  <label className="field">
                    <span>Enter your secret</span>
                    <input
                      inputMode="numeric"
                      value={secretDraft}
                      onChange={(event) => setSecretDraft(event.target.value)}
                      placeholder={'0'.repeat(game.digit_length)}
                    />
                  </label>

                  <button
                    type="submit"
                    className="button"
                    disabled={busyAction === 'secret'}
                  >
                    {busyAction === 'secret'
                      ? 'Submitting...'
                      : 'Lock in secret'}
                  </button>
                </>
              )}
            </form>
          )}

          {game.status === 'active' && (
            <form className="form-grid" onSubmit={handleGuessSubmit}>
              <div className="surface-card">
                <h4>Guess board</h4>
                <p>
                  {canGuess
                    ? `Take your shot at ${getDisplayName(opponent)}'s code.`
                    : `Waiting for ${getDisplayName(opponent)} to guess.`}
                </p>
              </div>

              <label className="field">
                <span>Your guess</span>
                <input
                  inputMode="numeric"
                  value={guessDraft}
                  onChange={(event) => setGuessDraft(event.target.value)}
                  placeholder={'0'.repeat(game.digit_length)}
                  disabled={!canGuess}
                />
              </label>

              <button
                type="submit"
                className="button"
                disabled={!canGuess || busyAction === 'guess'}
              >
                {busyAction === 'guess' ? 'Submitting...' : 'Submit guess'}
              </button>
            </form>
          )}

          {game.status === 'completed' && (
            <div className="revealed-grid">
              {game.game_secrets.map((secret) => (
                <article key={secret.player_id} className="surface-card">
                  <p>
                    {secret.player_id === user.id ? 'Your secret' : `${getDisplayName(opponent)}'s secret`}
                  </p>
                  <strong>{secret.secret_number}</strong>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Guess history</p>
              <h3>Every turn so far</h3>
            </div>
          </div>

          <div className="stack-list">
            {game.guesses.map((guess) => (
              <article key={guess.id} className="surface-card">
                <div className="surface-card__body">
                  <div>
                    <h4>
                      Turn {guess.turn_number} · {getDisplayName(guess.player)}
                    </h4>
                    <p>
                      Guess {guess.guess_value} · {guess.correct_count} matching
                      digit{guess.correct_count === 1 ? '' : 's'}
                    </p>
                  </div>

                  <span className="badge">{formatDateTime(guess.created_at)}</span>
                </div>
              </article>
            ))}

            {!game.guesses.length && (
              <p className="muted-copy">
                Guesses will appear here once both secret numbers are ready.
              </p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Comments</p>
              <h3>Talk through the match</h3>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleCommentSubmit}>
            <label className="field">
              <span>Add a comment</span>
              <textarea
                rows={3}
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="Good luck, have fun."
              />
            </label>

            <button
              type="submit"
              className="button button--small"
              disabled={busyAction === 'comment'}
            >
              {busyAction === 'comment' ? 'Posting...' : 'Post comment'}
            </button>
          </form>

          <div className="stack-list">
            {game.comments.map((comment) => (
              <article key={comment.id} className="surface-card">
                <div className="surface-card__body surface-card__body--top">
                  <div>
                    <h4>{getDisplayName(comment.player)}</h4>
                    <p>{comment.content}</p>
                  </div>
                  <span className="badge">{formatDateTime(comment.created_at)}</span>
                </div>
              </article>
            ))}

            {!game.comments.length && (
              <p className="muted-copy">
                No comments yet. Break the silence when you are ready.
              </p>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}

export default GameRoomPage
