import { requireSupabase } from './supabase.js'

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/

export function usernameToEmail(username) {
  return `${String(username).trim().toLowerCase()}@digitduel.local`
}

export async function registerUser({ username, password, displayName }) {
  const supabase = requireSupabase()
  const cleanUsername = String(username).trim().toLowerCase()

  if (!USERNAME_PATTERN.test(cleanUsername)) {
    throw new Error(
      'Username must be 3-20 characters and use only letters, numbers, or underscores.',
    )
  }

  const { data: existingUser, error: existingUserError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', cleanUsername)
    .maybeSingle()

  if (existingUserError) {
    throw existingUserError
  }

  if (existingUser) {
    throw new Error('Username is already taken.')
  }

  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(cleanUsername),
    password,
    options: {
      data: {
        username: cleanUsername,
        display_name: displayName?.trim() || cleanUsername,
      },
    },
  })

  if (error) {
    throw error
  }

  return data
}

export async function loginUser({ username, password }) {
  const supabase = requireSupabase()
  const cleanUsername = String(username).trim().toLowerCase()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(cleanUsername),
    password,
  })

  if (error) {
    throw error
  }

  return data
}

export async function logoutUser() {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
