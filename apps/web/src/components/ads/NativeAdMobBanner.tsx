import { useEffect } from "react"

import { isNativeAndroid, removeAdMobBanner, showAdMobBanner } from "@/lib/admob"
import { viewerHasAdFreeAccess } from "@/services/ads"

export default function NativeAdMobBanner() {
  useEffect(() => {
    let active = true

    void viewerHasAdFreeAccess().then((adFree) => {
      if (!active) return
      if (adFree) void removeAdMobBanner()
      else void showAdMobBanner()
    }).catch(() => {
      if (active) void removeAdMobBanner()
    })

    return () => {
      active = false
      void removeAdMobBanner()
    }
  }, [])

  return isNativeAndroid() ? <div className="h-14" aria-hidden="true" /> : null
}
