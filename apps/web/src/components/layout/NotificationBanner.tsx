import { Bell, X } from "lucide-react"
import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"
import { useFeatureFlag } from "@/contexts/FeatureFlagContext"

type Notice = { id: string; title: string; message: string; action_url: string | null }

export default function NotificationBanner() {
  const notificationsEnabled = useFeatureFlag("in_app_notifications", true)
  const [notices, setNotices] = useState<Notice[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    if (!notificationsEnabled) {
      return
    }

    const load = async () => {
      const { data } = await supabase.from("admin_notifications").select("id,title,message,action_url").eq("published", true).order("created_at", { ascending: false }).limit(3)
      setNotices((data ?? []) as Notice[])
    }
    void load()
    const channel = supabase.channel("viewer-notifications").on("postgres_changes", { event: "*", schema: "public", table: "admin_notifications" }, load).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [notificationsEnabled])

  if (!notificationsEnabled) return null

  return <>{notices.filter((notice) => !dismissed.includes(notice.id)).map((notice) => <aside key={notice.id} className="border-b border-sky-300/20 bg-sky-400/10 px-3 py-2.5 sm:px-6"><div className="mx-auto flex max-w-[var(--dv-content-max-width)] items-start gap-3"><Bell className="mt-0.5 size-4 shrink-0 text-sky-300" /><div className="min-w-0 flex-1 text-sm"><strong className="text-white">{notice.title}</strong><span className="ml-2 text-white/70">{notice.message}</span>{notice.action_url ? <a className="ml-2 font-semibold text-sky-200 underline" href={notice.action_url}>Learn more</a> : null}</div><button className="shrink-0 text-white/60 hover:text-white" onClick={() => setDismissed((current) => [...current, notice.id])} aria-label="Dismiss notification"><X className="size-4" /></button></div></aside>)}</>
}
