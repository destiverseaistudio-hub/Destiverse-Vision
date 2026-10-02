import { Download, Minimize2, RefreshCw, Sparkles, X } from "lucide-react"
import { useEffect, useState } from "react"

import { useContent } from "@/contexts/ContentContext"
import { activateLatestApp, fetchLatestVersion, runningBuildId } from "@/lib/app-update"

const checkIntervalMs = 60 * 1000
const forceUpdateTestMode = import.meta.env.DEV && import.meta.env.VITE_ENABLE_UPDATE_TEST_MODE === "true"

export default function AppUpdateBanner() {
  const { settings } = useContent()
  const [deploymentAvailable, setDeploymentAvailable] = useState(forceUpdateTestMode)
  const [latestBuildId, setLatestBuildId] = useState<string | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const releaseEnabled = settings.update_enabled === "true"
  const version = settings.update_version || settings.app_version || "Latest release"
  const available = releaseEnabled || deploymentAvailable
  const title = settings.update_title || "A new DestiVerse Vision update is ready"
  const message = settings.update_message || "Update now for the latest DestiVerse Vision experience."

  useEffect(() => {
    let active = true
    if (forceUpdateTestMode) return () => { active = false }
    const check = async () => {
      try {
        const latest = await fetchLatestVersion()
        if (!active || !latest.buildId) return
        setLatestBuildId(latest.buildId)
        setDeploymentAvailable(latest.buildId !== runningBuildId && latest.buildId !== window.localStorage.getItem("dv-last-acknowledged-build"))
      } catch { /* Offline and unavailable version endpoints must not interrupt viewing. */ }
    }
    void check()
    const timer = window.setInterval(() => void check(), checkIntervalMs)
    const onVisibility = () => { if (document.visibilityState === "visible") void check() }
    document.addEventListener("visibilitychange", onVisibility)
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility) }
  }, [])

  useEffect(() => {
    if (!available || minimized) { setShowModal(false); return }
    const timer = window.setTimeout(() => setShowModal(true), 5000)
    return () => window.clearTimeout(timer)
  }, [available, minimized, version])

  const update = async () => {
    if (settings.update_link && !deploymentAvailable) { window.open(settings.update_link, "_blank", "noopener,noreferrer"); return }
    setBusy(true); setFailed(false)
    try { await activateLatestApp(latestBuildId ?? undefined) }
    catch { setFailed(true); setBusy(false) }
  }
  const minimize = () => { setMinimized(true); setShowModal(false) }
  const actionLabel = busy ? "Updating" : failed ? "Try again" : settings.update_link && !deploymentAvailable ? "Update now" : "Update app"
  const UpdateButton = ({ full = false }: { full?: boolean }) => <button type="button" onClick={() => void update()} disabled={busy} className={`${full ? "w-full justify-center" : ""} inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--dv-accent)] px-3 py-2 text-xs font-bold text-white disabled:opacity-60`}><RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />{actionLabel}</button>

  if (!available || minimized) return null
  return <>
    <aside className="border-b border-[var(--dv-accent)]/25 bg-[var(--dv-accent)]/[0.09] px-3 py-2.5 sm:px-6" aria-live="polite" aria-label="App update available"><div className="mx-auto flex w-full max-w-[var(--dv-content-max-width)] items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--dv-accent)]/20 text-[var(--dv-accent)]"><Sparkles className="size-4" /></span><div className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{failed ? "Update could not be completed" : title}</strong><span className="block truncate text-xs text-white/65">{failed ? "Try again or continue using the current version." : `${version} · ${message}`}</span></div><UpdateButton /><button type="button" onClick={minimize} className="grid size-8 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" aria-label="Minimize update until refresh" title="Minimize until refresh"><Minimize2 className="size-4" /></button></div></aside>
    {showModal && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="update-dialog-title" className="w-full max-w-md rounded-3xl border border-[var(--dv-accent)]/30 bg-[var(--dv-surface)] p-6 shadow-2xl shadow-black/60"><div className="flex items-start justify-between gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[var(--dv-accent)]/15 text-[var(--dv-accent)]"><Download className="size-6" /></span><button type="button" onClick={minimize} className="grid size-9 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white" aria-label="Minimize update"><X className="size-4" /></button></div><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[var(--dv-accent)]">{version}</p><h2 id="update-dialog-title" className="mt-2 text-2xl font-black text-white">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-300">{message}</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><UpdateButton full /><button type="button" onClick={minimize} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white">Later</button></div><p className="mt-4 text-center text-xs text-slate-500">Later minimizes this message until the app is refreshed.</p></section></div>}
  </>
}
