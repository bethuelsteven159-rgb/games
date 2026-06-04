export const DIGIT_LENGTH_OPTIONS = [4, 5, 6]

export function normalizeError(error) {
  if (!error) {
    return 'Something went wrong.'
  }

  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error.message === 'string') {
    return error.message
  }

  return 'Something went wrong.'
}

export function getDisplayName(profile) {
  return (
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    'Unknown player'
  )
}

export function getInitials(profile) {
  const source = getDisplayName(profile)
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function formatDateTime(value) {
  if (!value) {
    return 'Not yet'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatShortDate(value) {
  if (!value) {
    return 'Not yet'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function formatWinRate(wins = 0, losses = 0) {
  const total = wins + losses

  if (!total) {
    return '0%'
  }

  return `${Math.round((wins / total) * 100)}%`
}

export function getOpponent(game, userId) {
  if (!game) {
    return null
  }

  return game.player_one_id === userId ? game.player_two : game.player_one
}

export function isMyTurn(game, userId) {
  return Boolean(game && userId && game.current_turn_player_id === userId)
}

export function validateDigitCode(code, digitLength, allowRepeats) {
  const cleanCode = String(code ?? '').trim()

  if (!new RegExp(`^[0-9]{${digitLength}}$`).test(cleanCode)) {
    return `Enter exactly ${digitLength} digits.`
  }

  if (!allowRepeats && new Set(cleanCode.split('')).size !== digitLength) {
    return 'Repeated digits are disabled for this match.'
  }

  return ''
}

export function getStatusLabel(status) {
  const map = {
    active: 'Active',
    accepted: 'Accepted',
    cancelled: 'Cancelled',
    completed: 'Completed',
    declined: 'Declined',
    expired: 'Expired',
    pending: 'Pending',
    setup: 'Setup',
  }

  return map[status] ?? status
}

export function buildProfileLink(playerId) {
  return `/head-to-head/${playerId}`
}
