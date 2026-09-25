import { Search, X } from "lucide-react"
import { useMemo, useState } from "react"

import ContentCard from "@/components/content/ContentCard"
import { Input } from "@/components/ui/input"
import { useContent } from "@/contexts/ContentContext"

export default function SearchPage() {
  const { rows } = useContent()
  const [query, setQuery] = useState("")

  const normalizedQuery = query.trim().toLowerCase()

  const searchableItems = useMemo(() => {
    const seen = new Set<string>()

    return rows
      .flatMap((row) => row.items)
      .filter((item) => {
        if (seen.has(item.id)) {
          return false
        }

        seen.add(item.id)
        return true
      })
  }, [rows])

  const results = useMemo(() => {
    if (!normalizedQuery) {
      return []
    }

    return searchableItems.filter((item) => {
      const searchableText = [
        item.title,
        item.description,
        item.type,
        item.category,
        item.meta,
        item.badge ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return searchableText.includes(normalizedQuery)
    })
  }, [normalizedQuery, searchableItems])

  function clearSearch() {
    setQuery("")
  }

  return (
    <div className="space-y-8 pb-4">
      <section className="relative overflow-hidden rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] bg-[var(--dv-surface)] shadow-[var(--dv-shadow-card)]">
        <div
          className="absolute inset-0 dv-art-river opacity-20"
          aria-hidden="true"
        />

        <div
          className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/60"
          aria-hidden="true"
        />

        <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dv-accent)]">
            DestiVerse Vision
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--dv-foreground)] sm:text-4xl lg:text-5xl">
            Search
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Find movies, series, short films, documentaries, and original
            stories across DestiVerse Vision.
          </p>
        </div>
      </section>

      <section aria-labelledby="search-heading">
        <div className="mb-4">
          <h2
            id="search-heading"
            className="text-lg font-semibold text-[var(--dv-foreground)] sm:text-xl"
          >
            Find something to watch
          </h2>

          <p className="mt-1 text-sm text-[var(--dv-muted-foreground)]">
            Search by title, category, type, or story details.
          </p>
        </div>

        <div className="relative max-w-3xl">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--dv-foreground-subtle)]"
            aria-hidden="true"
          />

          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies, series, stories..."
            aria-label="Search movies, series, stories"
            autoComplete="off"
            className="h-12 rounded-xl border-[var(--dv-border)] bg-[var(--dv-surface-elevated)] pl-12 pr-12 text-[var(--dv-foreground)] placeholder:text-[var(--dv-foreground-subtle)] focus:border-[var(--dv-accent)] focus:ring-[var(--dv-accent)]"
          />

          {query ? (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--dv-foreground-muted)] transition hover:bg-[var(--dv-surface-hover)] hover:text-[var(--dv-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dv-accent)]"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </section>

      {!normalizedQuery ? (
        <section
          className="dv-surface rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] p-8 text-center shadow-[var(--dv-shadow-card)] sm:p-10"
          aria-label="Search prompt"
        >
          <Search
            className="mx-auto size-8 text-[var(--dv-accent)]"
            aria-hidden="true"
          />

          <h2 className="mt-4 text-lg font-semibold text-[var(--dv-foreground)]">
            Start exploring
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--dv-muted-foreground)]">
            Enter a title, category, or keyword above to discover available
            DestiVerse Vision content.
          </p>
        </section>
      ) : (
        <section aria-labelledby="search-results-heading">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dv-accent)]">
                Search results
              </p>

              <h2
                id="search-results-heading"
                className="mt-1 text-2xl font-bold tracking-tight text-[var(--dv-foreground)] sm:text-3xl"
              >
                Results for "{query.trim()}"
              </h2>
            </div>

            <span className="text-sm text-[var(--dv-foreground-muted)]">
              {results.length}{" "}
              {results.length === 1 ? "title" : "titles"}
            </span>
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((item) => (
                <ContentCard key={item.id} item={item} className="w-full" />
              ))}
            </div>
          ) : (
            <div className="dv-surface rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] p-8 text-center shadow-[var(--dv-shadow-card)] sm:p-10">
              <Search
                className="mx-auto size-8 text-[var(--dv-foreground-subtle)]"
                aria-hidden="true"
              />

              <h3 className="mt-4 text-lg font-semibold text-[var(--dv-foreground)]">
                No matching titles found
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--dv-muted-foreground)]">
                Try a different title, category, type, or keyword.
              </p>

              <button
                type="button"
                onClick={clearSearch}
                className="mt-5 rounded-lg bg-[var(--dv-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dv-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dv-background)]"
              >
                Clear search
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
