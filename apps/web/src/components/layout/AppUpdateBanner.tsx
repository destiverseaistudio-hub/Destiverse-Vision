import { RefreshCw, X } from "lucide-react"
import { useEffect, useState } from "react"

import { activateLatestApp, fetchLatestVersion, runningBuildId } from "@/lib/app-update"

const checkIntervalMs = 30 * 60 * 1000
const forceUpdateTestMode = import.meta.env.DEV && import.meta.env.VITE_ENABLE_UPDATE_TEST_MODE === "true"

export default function AppUpdateBanner() {
  const [available, setAvailable] = useState(forceUpdateTestMode)
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [failed, setFailed] = useState(false)
  const [latestBuildId, setLatestBuildId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (forceUpdateTestMode) return () => { active = false }
    const check = async () => {
      try {
        const latest = await fetchLatestVersion()
        if (!active || !latest.buildId) return
        setLatestBuildId(latest.buildId)
        const acknowledgedBuild = window.localStorage.getItem("dv-last-acknowledged-build")
        setAvailable(latest.buildId !== runningBuildId && latest.buildId !== acknowledgedBuild)
      } catch (error) {
        // A version check must never block normal use when offline or an API route is unavailable.
        console.warn("DestiVerse version check skipped", error)
      }
    }
    void check()
    const timer = window.setInterval(() => void check(), checkIntervalMs)
    const onVisibility = () => { if (document.visibilityState === "visible") void check() }
    document.addEventListener("visibilitychange", onVisibility)
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility) }
  }, [])

  if (!available || dismissed) return null
  const update = async () => {
    setBusy(true)
    setFailed(false)
    try { await activateLatestApp(latestBuildId ?? undefined) } catch (error) { console.warn("DestiVerse update activation failed", error); setFailed(true); setBusy(false) }
  }
  return <aside className="border-b border-[var(--dv-accent)]/25 bg-[var(--dv-accent)]/[0.09] px-3 py-2.5 sm:px-6" aria-live="polite">
    <div className="mx-auto flex w-full max-w-[var(--dv-content-max-width)] items-center gap-3">
      <div className="min-w-0 flex-1"><strong className="block text-sm text-white">{failed ? "Update couldn't be completed" : "New DestiVerse Vision Update"}</strong><span className="text-xs text-white/65">{failed ? "Please try again or continue using the current version." : "A new version is available with fixes and improvements."}</span></div>
      <button type="button" onClick={() => void update()} disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--dv-accent)] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"><RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} /> {busy ? "Updating" : failed ? "Try Again" : "Update App"}</button>
      <button type="button" onClick={() => setDismissed(true)} className="grid size-8 shrink-0 place-items-center text-white/60 hover:text-white" aria-label="Update later"><X className="size-4" /></button>
    </div>
  </aside>
}
