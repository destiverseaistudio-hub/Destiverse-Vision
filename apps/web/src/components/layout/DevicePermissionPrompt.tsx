import { BellRing, Image, ShieldCheck, X } from "lucide-react"
import { useEffect, useState } from "react"

import { useAuth } from "@/contexts/AuthContext"
import { enablePushNotifications, getPushPermission, isPushEnabledOnThisDevice } from "@/lib/push-notifications"

const promptKey = (userId: string) => `dv-device-permissions-v1:${userId}`

export default function DevicePermissionPrompt() {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  const complete = () => {
    if (session?.user.id) window.localStorage.setItem(promptKey(session.user.id), "seen")
    setOpen(false)
  }

  useEffect(() => {
    if (!session?.user.id || window.localStorage.getItem(promptKey(session.user.id))) return
    let active = true
    const timer = window.setTimeout(() => {
      if (active) setOpen(true)
    }, 700)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [session?.user.id])

  const enableNotifications = async () => {
    setBusy(true)
    setMessage("")
    try {
      await enablePushNotifications()
      const [permission, enabled] = await Promise.all([getPushPermission(), isPushEnabledOnThisDevice()])
      if (permission !== "granted" || !enabled) throw new Error("Notifications were not enabled on this device.")
      complete()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Notifications could not be enabled.")
    } finally {
      setBusy(false)
    }
  }

  if (!open || !session) return null

  return <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="device-permissions-title" className="w-full max-w-md rounded-3xl border border-[var(--dv-accent)]/30 bg-[var(--dv-surface)] p-6 shadow-2xl shadow-black/60">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--dv-accent)]/15 text-[var(--dv-accent)]"><ShieldCheck className="size-6" /></span>
        <button type="button" onClick={complete} className="grid size-9 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close device permissions"><X className="size-4" /></button>
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-[var(--dv-accent)]">Your device, your choice</p>
      <h2 id="device-permissions-title" className="mt-2 text-2xl font-black text-white">Set up DestiVerse on this device</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">Choose which optional features you want to enable. Your phone or browser will show its own Allow or Don’t allow screen.</p>
      <div className="mt-5 space-y-3">
        <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/15 p-4"><BellRing className="mt-0.5 size-5 shrink-0 text-[var(--dv-accent)]" /><div><strong className="block text-sm text-white">Device notifications</strong><p className="mt-1 text-xs leading-5 text-slate-400">Get opted-in release updates and account alerts when DestiVerse is closed. You can change this at any time in Notifications.</p></div></div>
        <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/15 p-4"><Image className="mt-0.5 size-5 shrink-0 text-[var(--dv-accent)]" /><div><strong className="block text-sm text-white">Photos and videos</strong><p className="mt-1 text-xs leading-5 text-slate-400">When you upload a Reel, the system picker lets you select only the files you choose. DestiVerse does not request broad access to your library.</p></div></div>
      </div>
      {message ? <p role="status" className="mt-4 rounded-xl bg-amber-300/10 p-3 text-sm leading-5 text-amber-100">{message}</p> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => void enableNotifications()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><BellRing className="size-4" />{busy ? "Enabling…" : "Enable notifications"}</button>
        <button type="button" onClick={complete} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white">Not now</button>
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-slate-500">Upload access is requested only when you choose an image, video, or audio file. Denying an optional permission never prevents browsing the app.</p>
    </section>
  </div>
}
