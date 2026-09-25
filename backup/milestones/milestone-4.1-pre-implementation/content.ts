export type ContentType =
  | "Movie"
  | "Series"
  | "Short Film"
  | "Documentary"

export type ContentItem = {
  id: string
  title: string
  description: string
  type: ContentType
  category: string
  meta: string
  badge?: string
  artworkClass: string
  featured?: boolean
}

export type ContentRow = {
  title: string
  subtitle?: string
  items: ContentItem[]
}

export const featuredContent: ContentItem = {
  id: "river-goddess-gift",
  title: "The River Goddess's Gift",
  description:
    "A mysterious call awakens an ancient destiny, drawing a new generation into a story shaped by secrets, courage, and forces that refuse to remain forgotten.",
  type: "Series",
  category: "DestiVerse Reels",
  meta: "Original Storytelling",
  badge: "Featured",
  artworkClass: "dv-art-river",
  featured: true,
}

export const contentRows: ContentRow[] = [
  {
    title: "Trending Now",
    subtitle: "Popular stories viewers are watching right now.",
    items: [
      {
        id: "river-goddess-part-1",
        title:
          "The River Goddess's Gift Part 1 - A Mysterious Call A Destiny Awakens!",
        description:
          "A mysterious call awakens a destiny that will change everything.",
        type: "Short Film",
        category: "DestiVerse Reels",
        meta: "Part 1",
        badge: "Trending",
        artworkClass: "dv-art-river",
      },
      {
        id: "river-goddess-part-3",
        title:
          "The River Goddess's Gift Part 3 - The Covenant Secrets. Betrayal. A Destiny Revealed!",
        description:
          "Secrets surface as an ancient covenant forces a destiny into the open.",
        type: "Short Film",
        category: "DestiVerse Reels",
        meta: "Part 3",
        badge: "Trending",
        artworkClass: "dv-art-covenant",
      },
      {
        id: "iron-pharaoh-part-3",
        title:
          "The Iron Pharaoh Part 3 - The War of Egypt The Invasion Begins. The Hero Rises.",
        description:
          "The invasion begins as a rising hero is forced into a war that will define an era.",
        type: "Short Film",
        category: "DestiVerse Reels",
        meta: "Part 3",
        badge: "Trending",
        artworkClass: "dv-art-pharaoh",
      },
    ],
  },
  {
    title: "DestiVerse Reels",
    subtitle: "Short-form stories from the DestiVerse universe.",
    items: [
      {
        id: "river-goddess-part-1",
        title:
          "The River Goddess's Gift Part 1 - A Mysterious Call A Destiny Awakens!",
        description:
          "A mysterious call awakens a destiny that will change everything.",
        type: "Short Film",
        category: "DestiVerse Reels",
        meta: "Part 1",
        badge: "Reel",
        artworkClass: "dv-art-river",
      },
      {
        id: "river-goddess-part-3",
        title:
          "The River Goddess's Gift Part 3 - The Covenant Secrets. Betrayal. A Destiny Revealed!",
        description:
          "Secrets surface as an ancient covenant forces a destiny into the open.",
        type: "Short Film",
        category: "DestiVerse Reels",
        meta: "Part 3",
        badge: "Reel",
        artworkClass: "dv-art-covenant",
      },
      {
        id: "iron-pharaoh-part-3",
        title:
          "The Iron Pharaoh Part 3 - The War of Egypt The Invasion Begins. The Hero Rises.",
        description:
          "The invasion begins as a rising hero is forced into a war that will define an era.",
        type: "Short Film",
        category: "DestiVerse Reels",
        meta: "Part 3",
        badge: "Reel",
        artworkClass: "dv-art-pharaoh",
      },
    ],
  },
  {
    title: "DestiVerse Originals",
    subtitle: "Original productions created for DestiVerse.",
    items: [
      {
        id: "river-goddess-reels",
        title: "The River Goddess's Gift",
        description:
          "A cinematic original story built around mystery, destiny, and an awakening that cannot be ignored.",
        type: "Series",
        category: "Originals",
        meta: "DestiVerse Original",
        badge: "Original",
        artworkClass: "dv-art-river",
      },
      {
        id: "iron-pharaoh-original",
        title: "The Iron Pharaoh Part 3",
        description:
          "An epic historical action story as invasion brings a new hero to the forefront.",
        type: "Short Film",
        category: "Originals",
        meta: "DestiVerse Original",
        badge: "Original",
        artworkClass: "dv-art-pharaoh",
      },
    ],
  },
  {
    title: "African Stories",
    subtitle: "Stories rooted in African imagination and culture.",
    items: [
      {
        id: "river-goddess-african",
        title: "The River Goddess's Gift",
        description:
          "A culturally grounded story of mystery, destiny, and the power of an ancient legacy.",
        type: "Series",
        category: "African Stories",
        meta: "African Storytelling",
        artworkClass: "dv-art-river",
      },
      {
        id: "iron-pharaoh-african",
        title: "The Iron Pharaoh Part 3",
        description:
          "A sweeping African-inspired historical action story built around conflict and courage.",
        type: "Short Film",
        category: "African Stories",
        meta: "African Storytelling",
        artworkClass: "dv-art-pharaoh",
      },
    ],
  },
  {
    title: "AI Films",
    subtitle: "Cinematic stories brought to life with AI.",
    items: [
      {
        id: "river-goddess-ai-1",
        title:
          "The River Goddess's Gift Part 1 - A Mysterious Call A Destiny Awakens!",
        description:
          "A cinematic AI film experience blending mystery, atmosphere, and original storytelling.",
        type: "Short Film",
        category: "AI Films",
        meta: "AI Film",
        artworkClass: "dv-art-river",
      },
      {
        id: "river-goddess-ai-3",
        title:
          "The River Goddess's Gift Part 3 - The Covenant Secrets. Betrayal. A Destiny Revealed!",
        description:
          "A cinematic continuation where hidden secrets and destiny collide.",
        type: "Short Film",
        category: "AI Films",
        meta: "AI Film",
        artworkClass: "dv-art-covenant",
      },
      {
        id: "iron-pharaoh-ai-3",
        title:
          "The Iron Pharaoh Part 3 - The War of Egypt The Invasion Begins. The Hero Rises.",
        description:
          "An AI-crafted historical action experience focused on invasion, conflict, and heroism.",
        type: "Short Film",
        category: "AI Films",
        meta: "AI Film",
        artworkClass: "dv-art-pharaoh",
      },
    ],
  },
  {
    title: "Documentaries",
    subtitle: "Real stories, creative journeys, and behind-the-scenes.",
    items: [
      {
        id: "destiverse-stories",
        title: "DestiVerse Stories",
        description:
          "Behind-the-story conversations and creative journeys from the DestiVerse world.",
        type: "Documentary",
        category: "Documentaries",
        meta: "Coming Soon",
        badge: "Coming Soon",
        artworkClass: "dv-art-documentary",
      },
      {
        id: "behind-the-story",
        title: "Behind the Story",
        description:
          "Explore the creative process behind selected DestiVerse productions.",
        type: "Documentary",
        category: "Documentaries",
        meta: "Coming Soon",
        badge: "Coming Soon",
        artworkClass: "dv-art-documentary-alt",
      },
    ],
  },
]

export const allContent: ContentItem[] = Array.from(
  new Map(
    [featuredContent, ...contentRows.flatMap((row) => row.items)].map(
      (item) => [item.id, item],
    ),
  ).values(),
)

export function getContentById(contentId: string) {
  return allContent.find((item) => item.id === contentId)
}





