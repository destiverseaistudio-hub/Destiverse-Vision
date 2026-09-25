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

export async function signOut() {
  return supabase.auth.signOut()
}
