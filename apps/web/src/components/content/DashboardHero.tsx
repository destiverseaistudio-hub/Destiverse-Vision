import { Check, Info, Play, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"
import type { ContentItem } from "@/data/content"
import { getWatchlistIds, setWatchlistState } from "@/services/library"

type DashboardHeroProps = {
  featured: ContentItem
  heroTitle: string
  heroDescription: string
}

export default function DashboardHero({
  featured,
  heroTitle,
  heroDescription,
}: DashboardHeroProps) {
  const { session } = useAuth()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [prevSessionUser, setPrevSessionUser] = useState(session?.user?.id)
  if (session?.user?.id !== prevSessionUser) {
    setPrevSessionUser(session?.user?.id)
    if (!session?.user?.id) {
      setSaved(false)
    }
  }

  useEffect(() => {
    if (!session) return
    let active = true
    void getWatchlistIds()
      .then((ids) => { if (active) setSaved(ids.includes(featured.id)) })
      .catch(() => { if (active) setSaved(false) })
    return () => { active = false }
  }, [featured.id, session])
  const addToWatchlist = async () => {
    if (!session) { setMessage("Sign in to save this title."); return }
    setSaving(true); setMessage("")
    try { await setWatchlistState(featured.id, !saved); setSaved((value) => !value) }
    catch (error) { setMessage(typeof error === "object" && error && "message" in error && typeof error.message === "string" ? error.message : "Could not update your watchlist.") }
    setSaving(false)
  }
  return (
    <section className="relative min-h-[420px] overflow-hidden rounded-b-[1.25rem] border-b border-[var(--dv-border)] sm:min-h-[520px] lg:min-h-[560px] lg:rounded-[1.25rem] lg:border">
      <div
        className={`absolute inset-0 ${featured.artworkClass}`}
        style={
          featured.heroUrl
            ? {
                backgroundImage: `url(${featured.heroUrl})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            : undefined
        }
      />

      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--dv-background)] via-black/20 to-transparent" />

      <div className="relative z-10 flex min-h-[420px] max-w-2xl flex-col justify-end p-4 pb-8 sm:min-h-[520px] sm:p-8 sm:pb-12 lg:min-h-[560px] lg:p-12">
        <div className="mb-4 items-center gap-2 flex-wrap flex">
          {featured.badge ? (
            <span className="rounded-full bg-[var(--dv-accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
              {featured.badge}
            </span>
          ) : null}

          <span className="text-xs font-medium text-white/65">
            {featured.category}
          </span>

          <span className="text-xs text-white/40">•</span>

          <span className="text-xs text-white/65">{featured.type}</span>
        </div>

        <h1 className="max-w-xl text-3xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
          {heroTitle}
        </h1>

        <p className="mt-5 max-w-xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
          {heroDescription}
        </p>

        <div className="mt-6 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
          <Link
            to={`/dashboard/content/${featured.id}?play=1`}
            className="relative z-10 inline-flex h-11 shrink-0 items-center gap-2 rounded-[var(--dv-radius-control)] bg-[var(--dv-accent)] px-5 text-sm font-bold text-white transition hover:bg-[var(--dv-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Play className="h-4 w-4 fill-current" />
            Play
          </Link>

          <Link
            to={`/dashboard/content/${featured.id}`}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--dv-radius-control)] border-white/15 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Info className="h-4 w-4" />
            More Info
          </Link>

          <button
            type="button"
            aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
            onClick={() => void addToWatchlist()}
            disabled={saving}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--dv-radius-control)] border-white/15 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
          >
            {saved ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>
        {message ? <p className="relative z-10 mt-3 text-xs text-white/80">{message}</p> : null}
      </div>
    </section>
  )
}
