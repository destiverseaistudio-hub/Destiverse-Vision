import { useEffect, useState } from "react"

import { viewerIsPremium } from "@/services/ads"

export function usePremiumAccess() {
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void viewerIsPremium().then((value) => {
      if (active) { setIsPremium(value); setLoading(false) }
    })
    return () => { active = false }
  }, [])

  return { isPremium, loading }
}
