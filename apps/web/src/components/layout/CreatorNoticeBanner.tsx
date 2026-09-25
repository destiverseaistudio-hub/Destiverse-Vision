import { Bell, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type Notice = { id: string; title: string; message: string; action_url: string | null }

export default function CreatorNoticeBanner() {
  const { session } = useAuth(); const [notice, setNotice] = useState<Notice | null>(null)
  useEffect(() => { if (!session) return; const load = async () => { const { data } = await supabase.from("user_notifications").select("id,title,message,action_url").is("read_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(); setNotice(data) }; void load(); const channel = supabase.channel("creator-notices").on("postgres_changes", { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${session.user.id}` }, load).subscribe(); return () => { void supabase.removeChannel(channel) } }, [session])
  if (!notice) return null
  const dismiss = async () => { await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", notice.id); setNotice(null) }
  return <aside className="fixed inset-x-3 top-3 z-[70] mx-auto max-w-md rounded-2xl border border-[var(--dv-accent)]/40 bg-zinc-950/95 p-4 text-white shadow-2xl backdrop-blur"><div className="flex gap-3"><Bell className="mt-0.5 size-5 shrink-0 text-[var(--dv-accent)]" /><div className="min-w-0 flex-1"><strong className="text-sm">{notice.title}</strong><p className="mt-1 text-sm leading-5 text-slate-300">{notice.message}</p>{notice.action_url ? <Link to={notice.action_url} onClick={() => void dismiss()} className="mt-3 inline-block text-sm font-bold text-[var(--dv-accent)]">Open creator studio</Link> : null}</div><button type="button" onClick={() => void dismiss()} className="grid size-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Dismiss notification"><X className="size-4" /></button></div></aside>
}
