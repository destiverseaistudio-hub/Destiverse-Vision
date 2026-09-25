import { supabase } from "@/lib/supabase"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getAppOrigin() {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL
  const value = configured?.trim()

  if (value && /^https?:\/\//.test(value)) {
    return value.replace(/\/$/, "")
  }

  return window.location.origin
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
  const appOrigin = getAppOrigin()

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${appOrigin}/dashboard` },
  })
}

export async function requestPasswordReset(email: string) {
  const redirectTo = `${getAppOrigin()}/reset-password`

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
