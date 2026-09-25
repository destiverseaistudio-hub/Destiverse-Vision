import { useMemo, useState } from "react"

import ContentCard from "@/components/content/ContentCard"
import ContentRow from "@/components/content/ContentRow"
import { useContent } from "@/contexts/ContentContext"

type CategoryName =
  | "All"
  | "DestiVerse Reels"
  | "Originals"
  | "African Stories"
  | "AI Films"
  | "Documentaries"
  | "AI Video"
  | "Dancing AI Video"
  | "Podcast"
  | "CEO & Business"
  | "AI UGC"
  | "Creator Stories"

const categories: Array<{
  name: CategoryName
  description: string
  artworkClass: string
}> = [
  {
    name: "All",
    description:
      "Explore the full DestiVerse Vision collection.",
    artworkClass: "dv-art-river",
  },
  {
    name: "DestiVerse Reels",
    description:
      "AI films, stories, drama and original scripted storytelling.",
    artworkClass: "dv-art-river",
  },
  {
    name: "Originals",
    description:
      "Stories created from the DestiVerse universe.",
    artworkClass: "dv-art-covenant",
  },
  {
    name: "African Stories",
    description:
      "Powerful stories rooted in African imagination.",
    artworkClass: "dv-art-pharaoh",
  },
  {
    name: "AI Films",
    description:
      "Cinematic stories where imagination becomes reality.",
    artworkClass: "dv-art-river",
  },
  {
    name: "Documentaries",
    description:
      "Real stories and new perspectives.",
    artworkClass: "dv-art-documentary",
  },
  {
    name: "AI Video",
    description:
      "Short-form AI video experiments and visual stories.",
    artworkClass: "dv-art-river",
  },
  {
    name: "Dancing AI Video",
    description:
      "Movement, performance, and dance brought to life with AI.",
    artworkClass: "dv-art-pharaoh",
  },
  {
    name: "Podcast",
    description:
      "Conversations, ideas, and voices from the DestiVerse community.",
    artworkClass: "dv-art-covenant",
  },
  {
    name: "CEO & Business",
    description:
      "Leadership, entrepreneurship, and the people building what comes next.",
    artworkClass: "dv-art-documentary",
  },
  {
    name: "AI UGC",
    description:
      "Creator-led AI videos, experiments, and community stories.",
    artworkClass: "dv-art-river",
  },
  {
    name: "Creator Stories",
    description:
      "Behind-the-scenes conversations with the people making DestiVerse.",
    artworkClass: "dv-art-covenant",
  },
]

export default function CategoriesPage() {
  const { rows } = useContent()
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryName>("All")

  const selectedCategoryInfo = categories.find(
    (category) => category.name === selectedCategory,
  ) ?? categories[0]

  const filteredItems = useMemo(() => {
    if (selectedCategory === "All") {
      return []
    }

    const seen = new Set<string>()

    return rows
      .flatMap((row) => row.items)
      .filter((item) => {
        if (item.category !== selectedCategory) {
          return false
        }

        if (seen.has(item.id)) {
          return false
        }

        seen.add(item.id)
        return true
      })
  }, [rows, selectedCategory])

  return (
    <div className="space-y-8 pb-4">
      <section className="relative overflow-hidden rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] bg-[var(--dv-surface)] shadow-[var(--dv-shadow-card)]">
        <div
          className={`absolute inset-0 ${selectedCategoryInfo.artworkClass} opacity-25`}
          aria-hidden="true"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />

        <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dv-accent)]">
            DestiVerse Vision
          </p>

          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-[var(--dv-foreground)] sm:text-4xl lg:text-5xl">
            Browse Categories
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Discover movies, series, podcasts, AI videos and documentaries
            across the worlds of DestiVerse Vision.
          </p>
        </div>
      </section>

      <section aria-labelledby="category-filter-heading">
        <div className="mb-4">
          <h2
            id="category-filter-heading"
            className="text-lg font-semibold text-[var(--dv-foreground)] sm:text-xl"
          >
            Explore by category
          </h2>

          <p className="mt-1 text-sm text-[var(--dv-muted-foreground)]">
            Choose a collection to discover its stories.
          </p>
        </div>

        <div
          className="flex gap-2 overflow-x-auto pb-2"
          role="tablist"
          aria-label="Content categories"
        >
          {categories.map((category) => {
            const isActive = selectedCategory === category.name

            return (
              <button
                key={category.name}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedCategory(category.name)}
                className={[
                  "shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dv-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dv-background)]",
                  isActive
                    ? "border-[var(--dv-accent)] bg-[var(--dv-accent)] text-white shadow-[var(--dv-shadow-accent)]"
                    : "border-[var(--dv-border)] bg-[var(--dv-surface)] text-slate-300 hover:border-[var(--dv-border-strong)] hover:bg-[var(--dv-surface-hover)] hover:text-[var(--dv-foreground)]",
                ].join(" ")}
              >
                {category.name}
              </button>
            )
          })}
        </div>
      </section>

      {selectedCategory === "All" ? (
        <section className="space-y-10" aria-label="All content collections">
          {rows.map((row) => (
            <ContentRow
              key={row.title}
              title={row.title}
              subtitle={row.subtitle}
              items={row.items}
            />
          ))}
        </section>
      ) : (
        <section
          className="space-y-5"
          aria-labelledby="selected-category-heading"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dv-accent)]">
                Collection
              </p>

              <h2
                id="selected-category-heading"
                className="mt-1 text-2xl font-bold tracking-tight text-[var(--dv-foreground)] sm:text-3xl"
              >
                {selectedCategory}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dv-muted-foreground)]">
                {selectedCategoryInfo.description}
              </p>
            </div>

            <span className="text-sm text-slate-500">
              {filteredItems.length}{" "}
              {filteredItems.length === 1 ? "title" : "titles"}
            </span>
          </div>

          {filteredItems.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-3 sm:gap-5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="w-40 shrink-0 sm:w-44 md:w-48 lg:w-52"
                >
                  <ContentCard item={item} />
                </div>
              ))}
            </div>
          ) : (
            <div className="dv-surface rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] p-8 text-center shadow-[var(--dv-shadow-card)] sm:p-10">
              <h3 className="text-lg font-semibold text-[var(--dv-foreground)]">
                More stories are coming soon
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--dv-muted-foreground)]">
                This collection is being prepared for the DestiVerse
                Vision library.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
