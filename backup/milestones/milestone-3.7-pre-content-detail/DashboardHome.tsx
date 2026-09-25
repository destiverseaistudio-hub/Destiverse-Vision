import { Info, Play, Plus } from "lucide-react"
import { featuredContent, contentRows } from "@/data/content"
import ContentRow from "@/components/content/ContentRow"

export default function DashboardHome() {
  return (
    <div className="pb-8">
      <section className="relative min-h-[470px] overflow-hidden rounded-b-[1.25rem] border-b border-[var(--dv-border)] sm:min-h-[520px] lg:min-h-[560px] lg:rounded-[1.25rem] lg:border">
        <div className={`absolute inset-0 ${featuredContent.artworkClass}`} />

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--dv-background)] via-black/20 to-transparent" />

        <div className="relative flex min-h-[470px] max-w-2xl flex-col justify-end p-5 pb-10 sm:min-h-[520px] sm:p-8 sm:pb-12 lg:min-h-[560px] lg:p-12">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--dv-accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
              {featuredContent.badge}
            </span>

            <span className="text-xs font-medium text-white/65">
              {featuredContent.category}
            </span>

            <span className="text-xs text-white/40">•</span>

            <span className="text-xs text-white/65">
              {featuredContent.type}
            </span>
          </div>

          <h1 className="max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            {featuredContent.title}
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
            {featuredContent.description}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-[var(--dv-radius-control)] bg-white px-5 text-sm font-bold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Play className="h-4 w-4 fill-current" />
              Play
            </button>

            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-[var(--dv-radius-control)] border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Info className="h-4 w-4" />
              More Info
            </button>

            <button
              type="button"
              aria-label="Add to watchlist"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--dv-radius-control)] border border-white/15 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8 px-1 sm:mt-10 sm:px-0">
        <div className="mb-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--dv-accent)]">
            DestiVerse Vision
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--dv-foreground)] sm:text-3xl">
            Discover your next story
          </h2>
        </div>

        {contentRows.map((row) => (
          <ContentRow
            key={row.title}
            title={row.title}
            subtitle={row.subtitle}
            items={row.items}
          />
        ))}
      </section>
    </div>
  )
}
