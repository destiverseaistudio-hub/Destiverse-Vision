import { useCallback, useEffect, useState } from "react"

import type { UserProfile } from "@/types/profile"
import {
  getMyProfile,
  updateMyProfile,
} from "@/services/profile"
import { useAuth } from "@/contexts/AuthContext"

export type ProfileUpdateResult = {
  success: boolean
  profile: UserProfile | null
}

export type UseProfileResult = {
  profile: UserProfile | null
  loading: boolean
  error: string
  refreshProfile: () => Promise<void>
  updateProfile: (
    updates: Pick<UserProfile, "display_name" | "avatar_url">,
  ) => Promise<ProfileUpdateResult>
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

export function useProfile(): UseProfileResult {
  const { session, loading: authLoading } = useAuth()

  const [profile, setProfile] =
    useState<UserProfile | null>(null)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState("")

  const loadProfile = useCallback(async () => {
    await Promise.resolve()

    if (!session?.user) {
      setProfile(null)
      setError("")
      return
    }

    setLoading(true)
    setError("")

    try {
      const result = await getMyProfile()

      if (result.error) {
        setError(
          "We couldn't load your profile. Please try again.",
        )
        setProfile(null)
        return
      }

      setProfile(result.data)
    }
    catch (cause) {
      toError(cause)
      setError(
        "We couldn't load your profile. Please try again.",
      )
      setProfile(null)
    }
    finally {
      setLoading(false)
    }
  }, [session?.user])

  useEffect(() => {
    if (!authLoading) {
      // Loading the profile synchronizes external Supabase state after auth settles.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadProfile()
    }
  }, [authLoading, loadProfile])

  const updateProfile = useCallback(
    async (
      updates: Pick<
        UserProfile,
        "display_name" | "avatar_url"
      >,
    ) => {
      if (!session?.user) {
        return {
          success: false,
          profile: null,
        }
      }

      setLoading(true)
      setError("")

      try {
        const result = await updateMyProfile(updates)

        if (result.error) {
          setError(
            "We couldn't update your profile. Please try again.",
          )

          return {
            success: false,
            profile: null,
          }
        }

        setProfile(result.data)

        return {
          success: true,
          profile: result.data,
        }
      }
      catch (cause) {
        toError(cause)
        setError(
          "We couldn't update your profile. Please try again.",
        )

        return {
          success: false,
          profile: null,
        }
      }
      finally {
        setLoading(false)
      }
    },
    [session?.user],
  )

  return {
    profile,
    loading,
    error,
    refreshProfile: loadProfile,
    updateProfile,
  }
}
