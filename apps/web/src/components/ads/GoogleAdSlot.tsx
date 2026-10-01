import { useEffect, useRef, useState } from "react"

import { useContent } from "@/contexts/ContentContext"
import { viewerHasAdFreeAccess } from "@/services/ads"

type Placement = "home" | "content"

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

export default function GoogleAdSlot({ placement }: { placement: Placement }) {
  const { settings } = useContent()
  const [adFree, setAdFree] = useState(true)
  const pushed = useRef(false)
  const client = settings.google_adsense_client?.trim() || ""
  const slot = (placement === "home" ? settings.google_adsense_home_slot : settings.google_adsense_content_slot)?.trim() || ""
  const enabled = settings.google_adsense_enabled === "true" && /^ca-pub-\d{10,}$/.test(client) && /^\d{6,}$/.test(slot)

  useEffect(() => {
    let active = true
    void viewerHasAdFreeAccess().then((value) => { if (active) setAdFree(value) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!enabled || adFree || pushed.current) return
    const scriptId = "dv-google-adsense-script"
    const push = () => {
      if (pushed.current) return
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); pushed.current = true } catch { /* Ad blockers and unavailable inventory must not break viewing. */ }
    }
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null
    if (existing) { existing.addEventListener("load", push, { once: true }); if (window.adsbygoogle) push(); return () => existing.removeEventListener("load", push) }
    const script = document.createElement("script")
    script.id = scriptId
    script.async = true
    script.crossOrigin = "anonymous"
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
    script.addEventListener("load", push, { once: true })
    document.head.appendChild(script)
    return () => script.removeEventListener("load", push)
  }, [adFree, client, enabled])

  if (!enabled || adFree) return null
  return <aside className="mx-4 mt-5 min-h-[90px] overflow-hidden rounded-2xl border border-white/10 bg-[var(--dv-surface)] px-2 py-3 sm:mx-6 lg:mx-8" aria-label="Advertisement">
    <p className="mb-1 text-center text-[9px] font-bold uppercase tracking-[.18em] text-white/40">Advertisement</p>
    <ins className="adsbygoogle block" style={{ display: "block" }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
  </aside>
}
