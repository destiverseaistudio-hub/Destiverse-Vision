import { supabase } from "@/lib/supabase"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function signIn(
  email: string,
  password: string,
) {
  return supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  })
}

export async function signUp(
  email: string,
  password: string,
) {
  return supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
  })
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/dashboard` },
  })
}

export async function requestPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}/reset-password`

  return supabase.auth.resetPasswordForEmail(
    normalizeEmail(email),
    {
      redirectTo,
    },
  )
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({
    password,
  })
}

export async function getCurrentSession() {
  return supabase.auth.getSession()
}

export async function signOut() {
  return supabase.auth.signOut()
}
