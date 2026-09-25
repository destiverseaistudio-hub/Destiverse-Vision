import { ArrowRight, Play } from "lucide-react"
import type { ContentItem } from "@/data/content"

type ContentCardProps = {
  item: ContentItem
}

export default function ContentCard({ item }: ContentCardProps) {
  return (
    <article className="group w-[155px] shrink-0 sm:w-[180px] md:w-[200px] lg:w-[215px]">
      <button
        type="button"
        className="block w-full text-left"
        aria-label={`Open ${item.title}`}
      >
        <div
          className={`relative aspect-[2/3] overflow-hidden rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] ${item.artworkClass} shadow-[var(--dv-shadow-card)] transition duration-300 group-hover:-translate-y-1 group-hover:border-[var(--dv-border-strong)] group-hover:shadow-[var(--dv-shadow-elevated)] group-focus-within:ring-2 group-focus-within:ring-[var(--dv-accent)]`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            {item.badge ? (
              <span className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                {item.badge}
              </span>
            ) : (
              <span />
            )}

            <span className="rounded-full border border-white/15 bg-black/45 p-2 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
              {item.type}
            </p>

            <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-white">
              {item.title}
            </h3>
          </div>
        </div>
      </button>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="truncate text-xs text-[var(--dv-foreground-muted)]">
          {item.meta}
        </p>

        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--dv-foreground-subtle)] transition group-hover:translate-x-0.5 group-hover:text-[var(--dv-foreground)]" />
      </div>
    </article>
  )
}
