import { supabase } from "@/lib/supabase"

export async function signIn(
  email: string,
  password: string,
) {
  return supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
}

export async function signUp(
  email: string,
  password: string,
) {
  return supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}
