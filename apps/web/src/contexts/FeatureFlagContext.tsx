import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

import { supabase } from "@/lib/supabase"

type FeatureFlagContextValue = {
  loading: boolean
  isEnabled: (key: string, defaultValue?: boolean) => boolean
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null)

type FeatureFlagRecord = {
  key: string
  enabled: boolean
}

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadFlags = async () => {
      const { data } = await supabase
        .from("feature_flags")
        .select("key,enabled")

      if (!active) return

      setFlags(Object.fromEntries(
        ((data ?? []) as FeatureFlagRecord[]).map((flag) => [flag.key, flag.enabled]),
      ))
      setLoading(false)
    }

    void loadFlags()

    const channel = supabase
      .channel(`viewer-feature-flags-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_flags" }, () => {
        void loadFlags()
      })
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [])

  const value = useMemo<FeatureFlagContextValue>(() => ({
    loading,
    isEnabled: (key, defaultValue = false) => flags[key] ?? defaultValue,
  }), [flags, loading])

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFeatureFlag(key: string, defaultValue = false) {
  const context = useContext(FeatureFlagContext)
  if (!context) throw new Error("useFeatureFlag must be used inside FeatureFlagProvider")
  return context.isEnabled(key, defaultValue)
}
