import { ArrowLeft, UsersRound } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, Navigate, useSearchParams } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type Connection = { user_id: string; display_name: string; handle: string | null; avatar_url: string | null; followed_at: string }

export default function CreatorConnectionsPage() {
  const { session } = useAuth()
  const [params] = useSearchParams()
  const kind = params.get("view") === "following" ? "following" : "followers"
  const [connections, setConnections] = useState<Connection[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    if (!session) return
    void supabase.rpc("list_my_creator_connections", { p_view: kind }).then(({ data, error: loadError }) => {
      if (loadError) setError(loadError.message)
      else setConnections((data ?? []) as Connection[])
    })
  }, [kind, session])
  if (!session) return <Navigate to="/" replace />
  const title = kind === "followers" ? "Your followers" : "Creators you follow"
  return <main className="mx-auto max-w-2xl pb-10"><Link to={`/dashboard/creator/${session.user.id}`} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft className="size-4" />Back to your profile</Link><section className="mt-5 rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-5 sm:p-7"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[var(--dv-accent)]/15 text-[var(--dv-accent)]"><UsersRound className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">Creator community</p><h1 className="mt-1 text-2xl font-black text-white">{title}</h1></div></div>{error ? <p className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">Connections need the latest DestiVerse database update. {error}</p> : null}<div className="mt-6 grid gap-3">{connections.length ? connections.map((person) => <Link key={person.user_id} to={`/dashboard/creator/${person.user_id}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/10 p-3 transition hover:border-[var(--dv-accent)]/45"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--dv-accent)]/20 font-black text-[var(--dv-accent)]">{person.avatar_url ? <img src={person.avatar_url} alt="" className="size-full object-cover" /> : person.display_name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{person.display_name}</strong><span className="block truncate text-xs text-slate-400">{person.handle ? `@${person.handle}` : "DestiVerse viewer"}</span></span><time className="shrink-0 text-[11px] text-slate-500">{new Date(person.followed_at).toLocaleDateString()}</time></Link>) : !error ? <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">{kind === "followers" ? "When viewers follow your work, they will appear here." : "Follow a creator to build your viewing list."}</p> : null}</div></section></main>
}
