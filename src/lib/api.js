import { requireSupabase } from './supabase.js'

async function getCurrentUserOrThrow() {
  const supabase = requireSupabase()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error('Not logged in.')
  }

  return user
}

export async function getProfile(userId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getProfileSummary(userId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, bio, website_url, wins, losses',
    )
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateProfile(updates) {
  const supabase = requireSupabase()
  const user = await getCurrentUserOrThrow()
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function uploadAvatar(file) {
  const supabase = requireSupabase()
  const user = await getCurrentUserOrThrow()
  const fileExt = file.name.split('.').pop()
  const filePath = `${user.id}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data: publicUrlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  const avatarUrl = publicUrlData.publicUrl

  await updateProfile({
    avatar_url: avatarUrl,
  })

  return avatarUrl
}

export async function searchPlayers(searchText) {
  const supabase = requireSupabase()
  const cleanSearch = String(searchText ?? '').trim()
  let query = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, wins, losses')
    .order('wins', { ascending: false })
    .limit(20)

  if (cleanSearch) {
    query = query.or(
      `username.ilike.%${cleanSearch}%,display_name.ilike.%${cleanSearch}%`,
    )
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data ?? []
}

export async function sendChallenge({
  challengedId,
  digitLength = 4,
  allowRepeats = false,
  message = '',
}) {
  const supabase = requireSupabase()
  const user = await getCurrentUserOrThrow()
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      challenger_id: user.id,
      challenged_id: challengedId,
      game_type: 'number_duel',
      digit_length: digitLength,
      allow_repeats: allowRepeats,
      message,
    })
    .select(
      `
      *,
      challenger:challenger_id (id, username, display_name, avatar_url),
      challenged:challenged_id (id, username, display_name, avatar_url)
    `,
    )
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function cancelChallenge(challengeId) {
  const supabase = requireSupabase()
  const user = await getCurrentUserOrThrow()
  const { data, error } = await supabase
    .from('challenges')
    .update({
      status: 'cancelled',
      responded_at: new Date().toISOString(),
    })
    .eq('id', challengeId)
    .eq('challenger_id', user.id)
    .eq('status', 'pending')
    .select(
      `
      *,
      challenger:challenger_id (id, username, display_name, avatar_url),
      challenged:challenged_id (id, username, display_name, avatar_url)
    `,
    )
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function acceptChallenge(challengeId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('accept_challenge', {
    p_challenge_id: challengeId,
  })

  if (error) {
    throw error
  }

  return data
}

export async function declineChallenge(challengeId) {
  const supabase = requireSupabase()
  const { error } = await supabase.rpc('decline_challenge', {
    p_challenge_id: challengeId,
  })

  if (error) {
    throw error
  }
}

export async function listChallenges() {
  const supabase = requireSupabase()
  const user = await getCurrentUserOrThrow()
  const { data, error } = await supabase
    .from('challenges')
    .select(
      `
      *,
      challenger:challenger_id (id, username, display_name, avatar_url, wins, losses),
      challenged:challenged_id (id, username, display_name, avatar_url, wins, losses),
      game:game_id (id, status, current_turn_player_id, winner_id)
    `,
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return {
    incoming: (data ?? []).filter((challenge) => challenge.challenged_id === user.id),
    outgoing: (data ?? []).filter((challenge) => challenge.challenger_id === user.id),
  }
}

export async function listGames() {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('games')
    .select(
      `
      id,
      game_type,
      player_one_id,
      player_two_id,
      digit_length,
      allow_repeats,
      status,
      current_turn_player_id,
      winner_id,
      created_at,
      updated_at,
      started_at,
      completed_at,
      player_one:player_one_id (id, username, display_name, avatar_url, wins, losses),
      player_two:player_two_id (id, username, display_name, avatar_url, wins, losses)
    `,
    )
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getNotifications(limit = 10) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('notifications')
    .select(
      `
      *,
      actor:actor_id (id, username, display_name, avatar_url)
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return data ?? []
}

export async function markNotificationRead(notificationId) {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('notifications')
    .update({
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)

  if (error) {
    throw error
  }
}

export async function getDashboardData() {
  const [games, challenges, notifications] = await Promise.all([
    listGames(),
    listChallenges(),
    getNotifications(8),
  ])

  return {
    games,
    challenges,
    notifications,
  }
}

export async function getGame(gameId) {
  const supabase = requireSupabase()
  const [{ data: game, error: gameError }, { data: guesses, error: guessesError }, { data: comments, error: commentsError }, { data: secrets, error: secretsError }] =
    await Promise.all([
      supabase
        .from('games')
        .select(
          `
          *,
          player_one:player_one_id (id, username, display_name, avatar_url, wins, losses),
          player_two:player_two_id (id, username, display_name, avatar_url, wins, losses)
        `,
        )
        .eq('id', gameId)
        .single(),
      supabase
        .from('guesses')
        .select(
          `
          id,
          game_id,
          player_id,
          target_player_id,
          guess_value,
          correct_count,
          turn_number,
          created_at,
          player:player_id (id, username, display_name, avatar_url)
        `,
        )
        .eq('game_id', gameId)
        .order('turn_number', { ascending: true }),
      supabase
        .from('comments')
        .select(
          `
          id,
          guess_id,
          game_id,
          player_id,
          content,
          created_at,
          player:player_id (id, username, display_name, avatar_url)
        `,
        )
        .eq('game_id', gameId)
        .order('created_at', { ascending: true }),
      supabase
        .from('game_secrets')
        .select('player_id, secret_number, created_at')
        .eq('game_id', gameId),
    ])

  if (gameError) {
    throw gameError
  }

  if (guessesError) {
    throw guessesError
  }

  if (commentsError) {
    throw commentsError
  }

  if (secretsError) {
    throw secretsError
  }

  return {
    ...game,
    guesses: guesses ?? [],
    comments: comments ?? [],
    game_secrets: secrets ?? [],
  }
}

export async function submitSecret(gameId, secretNumber) {
  const supabase = requireSupabase()
  const { error } = await supabase.rpc('submit_secret', {
    p_game_id: gameId,
    p_secret_number: secretNumber,
  })

  if (error) {
    throw error
  }
}

export async function makeGuess(gameId, guess) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('make_guess', {
    p_game_id: gameId,
    p_guess: guess,
  })

  if (error) {
    throw error
  }

  return data
}

export async function addComment({ gameId, guessId = null, content }) {
  const supabase = requireSupabase()
  const user = await getCurrentUserOrThrow()
  const { data, error } = await supabase
    .from('comments')
    .insert({
      game_id: gameId,
      guess_id: guessId,
      player_id: user.id,
      content,
    })
    .select(
      `
      id,
      guess_id,
      game_id,
      player_id,
      content,
      created_at,
      player:player_id (id, username, display_name, avatar_url)
    `,
    )
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getHeadToHead(otherPlayerId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('get_head_to_head', {
    p_other_player_id: otherPlayerId,
  })

  if (error) {
    throw error
  }

  return data?.[0] ?? null
}

export function listenToGame(gameId, onChange) {
  const supabase = requireSupabase()
  const channel = supabase
    .channel(`game-${gameId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'guesses',
        filter: `game_id=eq.${gameId}`,
      },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `game_id=eq.${gameId}`,
      },
      onChange,
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

export function listenToDashboard(userId, onChange) {
  const supabase = requireSupabase()
  const channel = supabase
    .channel(`dashboard-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'games',
      },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'challenges',
      },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
