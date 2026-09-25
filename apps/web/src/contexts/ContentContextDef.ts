import { createContext } from "react"
import type { ContentItem, ContentRow } from "@/data/content"

export type DatabaseContent = {
  id: string
  title: string
  description: string
  type: ContentItem["type"]
  category: string
  meta: string
  badge: string | null
  artwork_class: string
  featured: boolean
  video_src: string | null
  home_section: string
  section_order: number
  display_order: number
  poster_url: string | null
  hero_url: string | null
  subtitles_url?: string | null
  episodes?: ContentItem["episodes"]
}

export type Settings = Record<string, string | undefined>

export type ContentContextValue = {
  content: ContentItem[]
  rows: ContentRow[]
  featured: ContentItem
  loading: boolean
  settings: Settings
}

export const ContentContext = createContext<ContentContextValue | null>(null)
