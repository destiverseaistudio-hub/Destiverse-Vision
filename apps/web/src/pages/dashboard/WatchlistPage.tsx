import { Bookmark, ChevronRight, Film } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import ContentCard from "@/components/content/ContentCard"
import { useContent } from "@/contexts/ContentContext"
import { getWatchlistIds } from "@/services/library"

export default function WatchlistPage() {
  const { content, rows } = useContent()
  const [savedIds, setSavedIds] = useState<string[]>([])

  useEffect(() => {
    void getWatchlistIds().then(setSavedIds).catch(() => setSavedIds([]))
  }, [])

  const savedContent = content.filter((item) => savedIds.includes(item.id))
  const recommendations = rows
    .flatMap((row) => row.items)
    .filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .slice(0, 4)

  return (
    <main className="space-y-8 pb-4">
      <section className="relative overflow-hidden rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] bg-[var(--dv-surface)] shadow-[var(--dv-shadow-card)]">
        <div
          className="absolute inset-0 dv-art-river opacity-15"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/60"
          aria-hidden="true"
        />

        <div className="relative px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--dv-accent)]/15 text-[var(--dv-accent)]">
            <Bookmark className="h-6 w-6" />
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dv-accent)]">
            My collection
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--dv-foreground)] sm:text-4xl">
            Watchlist
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Save movies, series, short films, and original stories you want to watch later.
          </p>
        </div>
      </section>

      {savedContent.length > 0 ? (
        <section>
          <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dv-accent)]">Saved titles</p><h2 className="mt-2 text-xl font-bold text-[var(--dv-foreground)] sm:text-2xl">Watch later</h2></div>
          <div className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">{savedContent.map((item) => <ContentCard key={item.id} item={item} />)}</div>
        </section>
      ) : (
      <section className="dv-surface rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] p-6 text-center shadow-[var(--dv-shadow-card)] sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--dv-surface-elevated)] text-[var(--dv-accent)]">
          <Film className="h-7 w-7" />
        </div>

        <h2 className="mt-5 text-xl font-semibold text-[var(--dv-foreground)]">
          Your watchlist is ready
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
          Titles you save will appear here. Explore DestiVerse Vision and choose what you want to keep for later.
        </p>

        <Link
          to="/dashboard/categories"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--dv-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Explore content
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
      )}

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dv-accent)]">
            Start exploring
          </p>
          <h2 className="mt-2 text-xl font-bold text-[var(--dv-foreground)] sm:text-2xl">
            Recommended for your watchlist
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Discover titles to add when you are ready to watch them.
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
          {recommendations.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </main>
  )
}
