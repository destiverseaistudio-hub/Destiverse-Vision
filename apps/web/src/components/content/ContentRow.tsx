import { ChevronRight } from "lucide-react"
import type { ContentItem } from "@/data/content"
import ContentCard from "./ContentCard"

type ContentRowProps = {
  title: string
  subtitle?: string
  items: ContentItem[]
}

export default function ContentRow({
  title,
  subtitle,
  items,
}: ContentRowProps) {
  return (
    <section className="mt-10 sm:mt-12">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--dv-foreground)] sm:text-2xl">
            {title}
          </h2>

          {subtitle ? (
            <p className="mt-1 text-xs text-[var(--dv-foreground-subtle)] sm:text-sm">
              {subtitle}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className="group hidden shrink-0 items-center gap-1 text-xs font-semibold text-[var(--dv-foreground-muted)] transition hover:text-[var(--dv-foreground)] sm:flex"
        >
          View all
          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-3 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
        role="list"
      >
        {items.map((item) => (
          <div key={item.id} role="listitem">
            <ContentCard item={item} />
          </div>
        ))}
      </div>
    </section>
  )
}
