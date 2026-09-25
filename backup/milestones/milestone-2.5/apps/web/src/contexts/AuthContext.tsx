import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"

import type { Session } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"

type AuthContextValue = {
  session: Session | null
  loading: boolean
}

const AuthContext =
  createContext<AuthContextValue>({
    session: null,
    loading: true,
  })

export function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, setSession] =
    useState<Session | null>(null)

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    let mounted = true

    async function initializeSession() {
      try {
        const { data } = await supabase.auth.getSession()

        if (mounted) {
          setSession(data.session)
        }
      }
      finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeSession()

    const {
      data: listener,
    } = supabase.auth.onAuthStateChange(
      (_, nextSession) => {
        if (mounted) {
          setSession(nextSession)
        }
      },
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
