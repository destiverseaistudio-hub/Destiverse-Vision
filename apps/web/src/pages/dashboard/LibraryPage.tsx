import { Bookmark, ChevronRight, Clock3, LibraryBig } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import ContentCard from "@/components/content/ContentCard"
import { useContent } from "@/contexts/ContentContext"
import { getWatchProgress } from "@/services/library"

export default function LibraryPage() {
  const { content } = useContent()
  const [progress, setProgress] = useState<Array<{ content_id: string; position_seconds: number; duration_seconds: number }>>([])

  useEffect(() => {
    let active = true

    async function loadProgress() {
      try {
        const nextProgress = await getWatchProgress()

        if (active) {
          setProgress(nextProgress)
        }
      } catch {
        if (active) {
          setProgress([])
        }
      }
    }

    void loadProgress()

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadProgress()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      active = false
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      )
    }
  }, [])

  const continueWatching = progress
    .map((entry) => ({
      item: content.find((candidate) => candidate.id === entry.content_id),
      progress: entry,
    }))
    .filter((entry) => entry.item)

  return (
    <main className="space-y-8 pb-4">
      <section className="relative overflow-hidden rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] bg-[var(--dv-surface)] shadow-[var(--dv-shadow-card)]">
        <div
          className="absolute inset-0 dv-art-pharaoh opacity-15"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/60"
          aria-hidden="true"
        />

        <div className="relative px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--dv-accent)]/15 text-[var(--dv-accent)]">
            <LibraryBig className="h-6 w-6" />
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dv-accent)]">
            Your space
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--dv-foreground)] sm:text-4xl">
            Library
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            A central place for the content you save and watch across DestiVerse Vision.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/dashboard/watchlist"
          className="group dv-surface rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] p-5 shadow-[var(--dv-shadow-card)] transition hover:-translate-y-0.5 hover:border-[var(--dv-accent)]/40 sm:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--dv-accent)]/10 text-[var(--dv-accent)]">
              <Bookmark className="h-5 w-5" />
            </div>
            <ChevronRight className="h-5 w-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-[var(--dv-foreground)]" />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-[var(--dv-foreground)]">
            Watchlist
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Keep titles you want to return to later in one place.
          </p>
        </Link>

        <div className="dv-surface rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] p-5 shadow-[var(--dv-shadow-card)] sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--dv-surface-elevated)] text-slate-400">
            <Clock3 className="h-5 w-5" />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-[var(--dv-foreground)]">
            Continue watching
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {continueWatching.length > 0 ? `${continueWatching.length} title${continueWatching.length === 1 ? "" : "s"} in progress.` : "Your viewing activity will appear here after you start watching."}
          </p>
        </div>
      </section>

      {continueWatching.length > 0 ? (
        <section>
          <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dv-accent)]">Pick up where you left off</p><h2 className="mt-2 text-xl font-bold text-[var(--dv-foreground)] sm:text-2xl">Continue watching</h2></div>
          <div className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">{continueWatching.map(({ item, progress: entry }) => <div className="w-[70vw] min-w-[220px] max-w-[280px] shrink-0 sm:w-auto" key={item!.id}><Link to={`/dashboard/content/${item!.id}?play=1`} className="block">
  <ContentCard item={item!} />
</Link><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[var(--dv-accent)]" style={{ width: `${Math.min(100, (entry.position_seconds / entry.duration_seconds) * 100)}%` }} /></div></div>)}</div>
        </section>
      ) : null}

      <section className="dv-surface rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] p-6 text-center shadow-[var(--dv-shadow-card)] sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--dv-surface-elevated)] text-slate-400">
          <LibraryBig className="h-7 w-7" />
        </div>

        <h2 className="mt-5 text-xl font-semibold text-[var(--dv-foreground)]">
          Keep watching, keep discovering
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
          Your watchlist and viewing activity are available here. Save titles and continue watching whenever you're ready.
        </p>

        <Link
          to="/dashboard/categories"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--dv-border)] px-5 py-3 text-sm font-semibold text-[var(--dv-foreground)] transition hover:bg-[var(--dv-surface-elevated)]"
        >
          Browse content
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  )
}


