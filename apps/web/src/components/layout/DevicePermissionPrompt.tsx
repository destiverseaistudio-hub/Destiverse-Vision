import { BellRing, Image, ShieldCheck, X } from "lucide-react"
import { useEffect, useState } from "react"

import { useAuth } from "@/contexts/AuthContext"
import { enablePushNotifications, getPushPermission, isPushEnabledOnThisDevice } from "@/lib/push-notifications"

type PermissionStep = "notifications" | "media" | null
const notificationPromptKey = (userId: string) => `dv-notification-permission-v1:${userId}`
const mediaPromptKey = (userId: string) => `dv-media-permission-v1:${userId}`

export default function DevicePermissionPrompt() {
  const { session } = useAuth()
  const [step, setStep] = useState<PermissionStep>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  const markNotificationsComplete = () => {
    if (session?.user.id) window.localStorage.setItem(notificationPromptKey(session.user.id), "seen")
    setMessage("")
    setStep("media")
  }
  const markMediaComplete = () => {
    if (session?.user.id) window.localStorage.setItem(mediaPromptKey(session.user.id), "seen")
    setStep(null)
  }

  useEffect(() => {
    if (!session?.user.id) return
    const nextStep: PermissionStep = window.localStorage.getItem(notificationPromptKey(session.user.id))
      ? window.localStorage.getItem(mediaPromptKey(session.user.id)) ? null : "media"
      : "notifications"
    if (!nextStep) return
    const timer = window.setTimeout(() => setStep(nextStep), 700)
    return () => window.clearTimeout(timer)
  }, [session?.user.id])

  const enableNotifications = async () => {
    setBusy(true)
    setMessage("")
    try {
      await enablePushNotifications()
      const [permission, enabled] = await Promise.all([getPushPermission(), isPushEnabledOnThisDevice()])
      if (permission !== "granted" || !enabled) throw new Error("Notifications were not enabled on this device.")
      markNotificationsComplete()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Notifications could not be enabled.")
    } finally {
      setBusy(false)
    }
  }

  if (!step || !session) return null
  const isNotificationStep = step === "notifications"

  return <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="device-permissions-title" className="w-full max-w-md rounded-3xl border border-[var(--dv-accent)]/30 bg-[var(--dv-surface)] p-6 shadow-2xl shadow-black/60">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--dv-accent)]/15 text-[var(--dv-accent)]">{isNotificationStep ? <BellRing className="size-6" /> : <Image className="size-6" />}</span>
        <button type="button" onClick={isNotificationStep ? markNotificationsComplete : markMediaComplete} className="grid size-9 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close permission setup"><X className="size-4" /></button>
      </div>
      {isNotificationStep ? <>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-[var(--dv-accent)]">Optional device permission</p>
        <h2 id="device-permissions-title" className="mt-2 text-2xl font-black text-white">Stay informed</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">Allow device notifications to receive opted-in DestiVerse release updates and account alerts when the app is closed.</p>
        {message ? <p role="status" className="mt-4 rounded-xl bg-amber-300/10 p-3 text-sm leading-5 text-amber-100">{message}</p> : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => void enableNotifications()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><BellRing className="size-4" />{busy ? "Enabling…" : "Allow notifications"}</button>
          <button type="button" onClick={markNotificationsComplete} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white">Not now</button>
        </div>
        <p className="mt-4 text-center text-xs leading-5 text-slate-500">You can change notification access later in Notifications or your device settings.</p>
      </> : <>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-[var(--dv-accent)]">Media uploads</p>
        <h2 id="device-permissions-title" className="mt-2 text-2xl font-black text-white">Choose media your way</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">When you upload a Reel, photo, video, or sound, your phone opens its own secure picker. You choose exactly what to share.</p>
        <div className="mt-5 flex gap-3 rounded-2xl border border-white/10 bg-black/15 p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--dv-accent)]" /><p className="text-xs leading-5 text-slate-400">DestiVerse does not ask for broad access to your entire photo library. If your phone asks for access later, you can allow selected items or deny it according to your device’s options.</p></div>
        <button type="button" onClick={markMediaComplete} className="mt-6 w-full rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white">Continue</button>
        <p className="mt-4 text-center text-xs leading-5 text-slate-500">Denying media access never prevents browsing; it only stops that upload until you choose a file later.</p>
      </>}
    </section>
  </div>
}
