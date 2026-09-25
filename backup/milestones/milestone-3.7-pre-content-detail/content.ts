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

export const featuredContent: ContentItem = {
  id: "river-goddess-gift",
  title: "The River Goddess's Gift",
  description:
    "A mysterious call awakens a destiny tied to an ancient secret. As the truth begins to surface, every choice brings the characters closer to a revelation they were never prepared to face.",
  type: "Series",
  category: "DestiVerse Reels",
  meta: "Original Storytelling",
  badge: "Featured",
  artworkClass: "dv-art-river",
  featured: true,
}

export const contentRows: Array<{
  title: string
  subtitle?: string
  items: ContentItem[]
}> = [
  {
    title: "Trending Now",
    subtitle: "Stories audiences are discovering",
    items: [
      {
        id: "river-goddess-part-1",
        title: "The River Goddess's Gift Part 1",
        description:
          "A mysterious call begins a journey toward a destiny that cannot be ignored.",
        type: "Series",
        category: "DestiVerse Reels",
        meta: "Part 1",
        badge: "Trending",
        artworkClass: "dv-art-river",
      },
      {
        id: "river-goddess-part-3",
        title: "The River Goddess's Gift Part 3",
        description:
          "The covenant deepens as secrets, betrayal, and destiny collide.",
        type: "Series",
        category: "DestiVerse Reels",
        meta: "Part 3",
        badge: "New",
        artworkClass: "dv-art-covenant",
      },
      {
        id: "iron-pharaoh-part-3",
        title: "The Iron Pharaoh Part 3",
        description:
          "The war of Egypt begins as invasion threatens everything in its path.",
        type: "Movie",
        category: "DestiVerse Reels",
        meta: "Part 3",
        badge: "Trending",
        artworkClass: "dv-art-pharaoh",
      },
    ],
  },
  {
    title: "DestiVerse Reels",
    subtitle: "AI films, stories, drama and original scripted storytelling",
    items: [
      {
        id: "river-goddess-reels",
        title: "The River Goddess's Gift",
        description:
          "A mysterious call awakens a destiny.",
        type: "Series",
        category: "DestiVerse Reels",
        meta: "Original Series",
        artworkClass: "dv-art-river",
      },
      {
        id: "river-goddess-covenant",
        title: "The River Goddess's Gift Part 3",
        description:
          "The covenant. Secrets. Betrayal. A destiny revealed.",
        type: "Series",
        category: "DestiVerse Reels",
        meta: "Part 3",
        artworkClass: "dv-art-covenant",
      },
      {
        id: "iron-pharaoh",
        title: "The Iron Pharaoh Part 3",
        description:
          "The war of Egypt. The invasion begins. The hero rises.",
        type: "Movie",
        category: "DestiVerse Reels",
        meta: "Part 3",
        artworkClass: "dv-art-pharaoh",
      },
    ],
  },
  {
    title: "DestiVerse Originals",
    subtitle: "Stories from the DestiVerse universe",
    items: [
      {
        id: "dv-original-river",
        title: "The River Goddess's Gift",
        description:
          "An original scripted story built around mystery, destiny and ancient secrets.",
        type: "Series",
        category: "Originals",
        meta: "DestiVerse Original",
        artworkClass: "dv-art-river",
      },
      {
        id: "dv-original-pharaoh",
        title: "The Iron Pharaoh Part 3",
        description:
          "A historical action story where war changes the fate of a kingdom.",
        type: "Movie",
        category: "Originals",
        meta: "DestiVerse Original",
        artworkClass: "dv-art-pharaoh",
      },
    ],
  },
  {
    title: "African Stories",
    subtitle: "Powerful stories rooted in African imagination",
    items: [
      {
        id: "african-river",
        title: "The River Goddess's Gift",
        description:
          "Mystery, tradition and destiny converge around a powerful river.",
        type: "Series",
        category: "African Stories",
        meta: "African Story",
        artworkClass: "dv-art-river",
      },
      {
        id: "african-pharaoh",
        title: "The Iron Pharaoh Part 3",
        description:
          "An epic chapter of conflict, courage and rising resistance.",
        type: "Movie",
        category: "African Stories",
        meta: "African Story",
        artworkClass: "dv-art-pharaoh",
      },
    ],
  },
  {
    title: "AI Films",
    subtitle: "Where imagination becomes reality",
    items: [
      {
        id: "ai-river",
        title: "The River Goddess's Gift Part 1",
        description:
          "AI-powered cinematic storytelling with an original scripted narrative.",
        type: "Series",
        category: "AI Films",
        meta: "AI Film",
        artworkClass: "dv-art-river",
      },
      {
        id: "ai-covenant",
        title: "The River Goddess's Gift Part 3",
        description:
          "A cinematic chapter of secrets, betrayal and destiny.",
        type: "Series",
        category: "AI Films",
        meta: "AI Film",
        artworkClass: "dv-art-covenant",
      },
      {
        id: "ai-pharaoh",
        title: "The Iron Pharaoh Part 3",
        description:
          "The invasion begins and a hero rises.",
        type: "Movie",
        category: "AI Films",
        meta: "AI Film",
        artworkClass: "dv-art-pharaoh",
      },
    ],
  },
  {
    title: "Documentaries",
    subtitle: "Real stories. New perspectives.",
    items: [
      {
        id: "documentary-placeholder-1",
        title: "DestiVerse Stories",
        description:
          "A future documentary collection celebrating creators, cultures and extraordinary stories.",
        type: "Documentary",
        category: "Documentaries",
        meta: "Coming soon",
        badge: "Coming Soon",
        artworkClass: "dv-art-documentary",
      },
      {
        id: "documentary-placeholder-2",
        title: "Behind the Story",
        description:
          "A future look at the creative worlds behind DestiVerse productions.",
        type: "Documentary",
        category: "Documentaries",
        meta: "Coming soon",
        badge: "Coming Soon",
        artworkClass: "dv-art-documentary-alt",
      },
    ],
  },
]
