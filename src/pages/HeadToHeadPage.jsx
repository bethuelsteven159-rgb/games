import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getHeadToHead, getProfileSummary } from '../lib/api.js'
import {
  formatDateTime,
  getDisplayName,
  normalizeError,
} from '../lib/utils.js'

function HeadToHeadPage() {
  const { playerId } = useParams()
  const [opponent, setOpponent] = useState(null)
  const [record, setRecord] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadHeadToHead = async () => {
      setIsLoading(true)

      try {
        const [profile, summary] = await Promise.all([
          getProfileSummary(playerId),
          getHeadToHead(playerId),
        ])

        if (!isMounted) {
          return
        }

        setOpponent(profile)
        setRecord(summary)
        setError('')
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setError(normalizeError(loadError))
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadHeadToHead()

    return () => {
      isMounted = false
    }
  }, [playerId])

  if (isLoading) {
    return (
      <section className="panel">
        <p className="muted-copy">Loading the rivalry board...</p>
      </section>
    )
  }

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Head-to-head</p>
          <h2>Against {getDisplayName(opponent)}</h2>
        </div>

        <Link className="button button--ghost button--small" to="/search">
          Challenge again
        </Link>
      </div>

      {error && <p className="feedback feedback--error">{error}</p>}

      <div className="mini-grid">
        <article className="surface-card">
          <p>Games played</p>
          <strong>{record?.games_played ?? 0}</strong>
        </article>

        <article className="surface-card">
          <p>My wins</p>
          <strong>{record?.my_wins ?? 0}</strong>
        </article>

        <article className="surface-card">
          <p>Opponent wins</p>
          <strong>{record?.opponent_wins ?? 0}</strong>
        </article>

        <article className="surface-card">
          <p>My win rate</p>
          <strong>{record?.my_win_rate ?? 0}%</strong>
        </article>
      </div>

      <section className="panel">
        <h3>Rival snapshot</h3>
        <p>@{opponent?.username}</p>
        <p>{opponent?.bio || 'No bio added yet.'}</p>
        <p>Last completed game: {formatDateTime(record?.last_game_at)}</p>
        {opponent?.website_url && (
          <p>
            Website:{' '}
            <a href={opponent.website_url} target="_blank" rel="noreferrer">
              {opponent.website_url}
            </a>
          </p>
        )}
      </section>
    </section>
  )
}

export default HeadToHeadPage
