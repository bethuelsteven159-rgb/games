import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { updateProfile, uploadAvatar } from '../lib/api.js'
import {
  formatWinRate,
  getDisplayName,
  normalizeError,
} from '../lib/utils.js'

function ProfilePage() {
  const { profile, refreshProfile, setProfile } = useAuth()
  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    website_url: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    setForm({
      display_name: profile?.display_name ?? '',
      bio: profile?.bio ?? '',
      website_url: profile?.website_url ?? '',
    })
  }, [profile?.display_name, profile?.bio, profile?.website_url])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const nextProfile = await updateProfile(form)
      setProfile(nextProfile)
      setSuccess('Profile updated.')
    } catch (saveError) {
      setError(normalizeError(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsUploading(true)
    setError('')
    setSuccess('')

    try {
      await uploadAvatar(file)
      await refreshProfile()
      setSuccess('Avatar uploaded.')
    } catch (uploadError) {
      setError(normalizeError(uploadError))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Profile</p>
          <h2>{getDisplayName(profile)}</h2>
        </div>
      </div>

      <div className="two-column-grid">
        <section className="panel">
          <div className="profile-hero">
            {profile?.avatar_url ? (
              <img
                className="avatar avatar--large"
                src={profile.avatar_url}
                alt={`${getDisplayName(profile)} avatar`}
              />
            ) : (
              <div className="avatar avatar--large avatar--fallback">
                {getDisplayName(profile).slice(0, 1).toUpperCase()}
              </div>
            )}

            <div>
              <h3>@{profile?.username}</h3>
              <p>
                {profile?.wins ?? 0} wins · {profile?.losses ?? 0} losses ·{' '}
                {formatWinRate(profile?.wins, profile?.losses)} win rate
              </p>
            </div>
          </div>

          <label className="field">
            <span>Upload avatar</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
          </label>
        </section>

        <section className="panel">
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Display name</span>
              <input
                value={form.display_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    display_name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Website</span>
              <input
                value={form.website_url}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    website_url: event.target.value,
                  }))
                }
                placeholder="https://example.com"
              />
            </label>

            <label className="field">
              <span>Bio</span>
              <textarea
                rows={5}
                value={form.bio}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    bio: event.target.value,
                  }))
                }
                placeholder="Tell other players what kind of duelist you are."
              />
            </label>

            {error && <p className="feedback feedback--error">{error}</p>}
            {success && <p className="feedback feedback--success">{success}</p>}

            <button type="submit" className="button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </section>
      </div>
    </section>
  )
}

export default ProfilePage
