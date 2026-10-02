import { Bell, BellRing, CheckCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { disablePushNotifications, enablePushNotifications, getPushPermission, isPushEnabledOnThisDevice } from "@/lib/push-notifications"

type Notice = { id: string; title: string; message: string; action_url: string | null; read_at: string | null; created_at: string }

export default function NotificationsPage() {
  const { session } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [pushMessage, setPushMessage] = useState("")
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("unsupported")
  const [pushEnabledOnDevice, setPushEnabledOnDevice] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    const fetchNotices = async () => {
      const { data } = await supabase
        .from("user_notifications")
        .select("id,title,message,action_url,read_at,created_at")
        .order("created_at", { ascending: false })
      if (active) {
        setNotices((data ?? []) as Notice[])
      }
    }
    void fetchNotices()
    return () => { active = false }
  }, [session?.user?.id])
  useEffect(() => { void Promise.all([getPushPermission(), isPushEnabledOnThisDevice()]).then(([permission, enabled]) => { setPushPermission(permission); setPushEnabledOnDevice(enabled) }) }, [])
  if (!session) return <Navigate to="/" replace />

  const markRead = async (id: string) => {
    await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", id)
    setNotices(current => current.map(notice => notice.id === id ? { ...notice, read_at: new Date().toISOString() } : notice))
  }
  const markAllRead = async () => {
    await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null)
    setNotices(current => current.map(notice => ({ ...notice, read_at: notice.read_at ?? new Date().toISOString() })))
  }
  const enablePush = async () => {
    try { await enablePushNotifications(); setPushPermission(await getPushPermission()); setPushEnabledOnDevice(await isPushEnabledOnThisDevice()); setPushMessage("Phone notifications are enabled for this device.") }
    catch (error) { setPushMessage(error instanceof Error ? error.message : "Notifications could not be enabled.") }
  }
  const disablePush = async () => {
    try { await disablePushNotifications(); setPushPermission(await getPushPermission()); setPushEnabledOnDevice(await isPushEnabledOnThisDevice()); setPushMessage("Phone notifications are disabled for this device. Browser permission may remain granted, but DestiVerse can no longer send pushes to this device.") }
    catch (error) { setPushMessage(error instanceof Error ? error.message : "Notifications could not be disabled.") }
  }

  const pushEnabled = pushPermission === "granted" && pushEnabledOnDevice
  return <main className="mx-auto max-w-3xl pb-10"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">Account</p><h1 className="mt-2 text-3xl font-black text-white">Notifications</h1><p className="mt-2 text-sm text-slate-400">Creator access, safety, account, and app updates.</p></div>{notices.some(notice => !notice.read_at) ? <button type="button" onClick={() => void markAllRead()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white"><CheckCheck className="size-4" /> Mark all read</button> : null}</div><section className="mt-6 rounded-2xl border border-white/10 bg-[var(--dv-surface)] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong className="text-white">Device notifications</strong><p className="mt-1 text-sm text-slate-400">When DestiVerse is closed, enabled alerts appear in this device’s notification bar. Your account and creator alerts remain available below.</p></div>{pushEnabled ? <button type="button" onClick={() => void disablePush()} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-white"><Bell className="size-4" /> Disable on this device</button> : <button type="button" onClick={() => void enablePush()} disabled={pushPermission === "denied" || pushPermission === "unsupported"} className="inline-flex items-center gap-2 rounded-xl bg-[var(--dv-accent)] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><BellRing className="size-4" /> Enable device notifications</button>}</div>{pushPermission === "denied" ? <p className="mt-3 text-sm text-amber-200">Notifications are blocked in your browser or device settings. Allow them there, then return here.</p> : null}{pushPermission === "unsupported" ? <p className="mt-3 text-sm text-slate-400">This browser does not support device push notifications.</p> : null}{pushMessage ? <p className="mt-3 text-sm text-slate-300">{pushMessage}</p> : null}</section><section className="mt-6 grid gap-3">{notices.length ? notices.map(notice => <article key={notice.id} className={`rounded-2xl border p-4 ${notice.read_at ? "border-white/10 bg-black/10" : "border-[var(--dv-accent)]/40 bg-[var(--dv-accent)]/10"}`}><div className="flex gap-3"><Bell className="mt-0.5 size-5 shrink-0 text-[var(--dv-accent)]" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-white">{notice.title}</strong><time className="text-xs text-slate-500">{new Date(notice.created_at).toLocaleString()}</time></div><p className="mt-2 text-sm leading-6 text-slate-300">{notice.message}</p><div className="mt-3 flex gap-4 text-sm font-bold">{notice.action_url ? <Link to={notice.action_url} onClick={() => void markRead(notice.id)} className="text-[var(--dv-accent)]">Open</Link> : null}{!notice.read_at ? <button type="button" onClick={() => void markRead(notice.id)} className="text-slate-300">Mark read</button> : null}</div></div></div></article>) : <div className="rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-10 text-center text-sm text-slate-400">You have no notifications yet.</div>}</section></main>
}
