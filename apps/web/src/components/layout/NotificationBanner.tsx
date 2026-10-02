import { Bell, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"
import { useFeatureFlag } from "@/contexts/FeatureFlagContext"
import { supabase } from "@/lib/supabase"

type Notice = { id: string; title: string; message: string; action_url: string | null }

function NoticeAction({ notice, onOpen }: { notice: Notice; onOpen: () => void }) {
  if (!notice.action_url) return null
  const className = "mt-2 inline-block text-xs font-bold text-sky-200 underline underline-offset-2"
  return notice.action_url.startsWith("/")
    ? <Link className={className} to={notice.action_url} onClick={onOpen}>Open notification</Link>
    : <a className={className} href={notice.action_url} target="_blank" rel="noreferrer" onClick={onOpen}>Open notification</a>
}

export default function NotificationBanner() {
  const { session } = useAuth()
  const featureEnabled = useFeatureFlag("in_app_notifications", true)
  const [preferenceEnabled, setPreferenceEnabled] = useState(true)
  const [notices, setNotices] = useState<Notice[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const enabled = featureEnabled && preferenceEnabled

  useEffect(() => {
    if (!session?.user.id) return
    let active = true
    void supabase.from("user_preferences").select("notifications_enabled").eq("user_id", session.user.id).maybeSingle().then(({ data }) => {
      if (active) setPreferenceEnabled(data?.notifications_enabled !== false)
    })
    return () => { active = false }
  }, [session?.user.id])

  useEffect(() => {
    if (!enabled) return
    const load = async () => {
      const { data } = await supabase.from("admin_notifications").select("id,title,message,action_url").eq("published", true).order("created_at", { ascending: false }).limit(3)
      setNotices((data ?? []) as Notice[])
    }
    void load()
    const channel = supabase.channel(`viewer-notifications-${crypto.randomUUID()}`).on("postgres_changes", { event: "*", schema: "public", table: "admin_notifications" }, load).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [enabled])

  if (!enabled) return null
  const notice = notices.find((item) => !dismissed.includes(item.id))
  if (!notice) return null
  const minimize = () => setDismissed((current) => [...current, notice.id])

  return <aside className="border-b border-sky-300/20 bg-sky-400/10 px-3 py-2.5 sm:px-6" aria-live="polite"><div className="mx-auto flex w-full max-w-[var(--dv-content-max-width)] items-start gap-3"><Bell className="mt-0.5 size-4 shrink-0 text-sky-300" /><div className="min-w-0 flex-1"><strong className="block text-sm text-white">{notice.title}</strong><p className="mt-0.5 break-words text-xs leading-5 text-white/70">{notice.message}</p><NoticeAction notice={notice} onOpen={minimize} /></div><button type="button" className="grid size-8 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" onClick={minimize} aria-label="Minimize notification until refresh" title="Minimize until refresh"><X className="size-4" /></button></div></aside>
}
