import { useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { allContent as fallbackContent, contentRows as fallbackRows, featuredContent as fallbackFeatured } from "@/data/content"
import type { ContentItem } from "@/data/content"
import { ContentContext, type DatabaseContent, type Settings } from "./ContentContextDef"

export function useContent() {
  const context = useContext(ContentContext)

  if (!context) {
    throw new Error("useContent must be used inside ContentProvider")
  }

  return context
}

const subtitles: Record<string, string> = { "Trending Now": "Popular stories viewers are watching right now.", "DestiVerse Reels": "Short-form stories from the DestiVerse universe.", Originals: "Made for DestiVerse Vision.", "African Stories": "Stories with perspective and imagination.", "AI Films": "New visual worlds shaped with AI.", Documentaries: "Real ideas, people, and conversations." }
const mapContent = (item: DatabaseContent): ContentItem => ({ id: item.id, title: item.title, description: item.description, type: item.type, category: item.category, meta: item.meta, badge: item.badge ?? undefined, artworkClass: item.artwork_class, featured: item.featured, videoSrc: item.video_src ?? undefined, homeSection: item.home_section, sectionOrder: item.section_order, displayOrder: item.display_order, posterUrl: item.poster_url ?? undefined, heroUrl: item.hero_url ?? undefined, subtitlesUrl: item.subtitles_url ?? undefined, episodes: Array.isArray(item.episodes) ? item.episodes : [] })
function group(items: ContentItem[]) { const featured = items.find((item) => item.featured) ?? items[0] ?? fallbackFeatured; const sections = new Map<string, ContentItem[]>(); items.forEach((item) => { const key = item.homeSection || item.category; sections.set(key, [...(sections.get(key) ?? []), item]) }); const rows = [...sections].map(([title, section]) => ({ title, subtitle: subtitles[title] ?? `Stories from ${title}.`, items: section.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)) })); return { featured, rows } }

export function ContentProvider({ children }: { children: ReactNode }) { const [content, setContent] = useState<ContentItem[]>(fallbackContent); const [loading, setLoading] = useState(true); const [settings, setSettings] = useState<Settings>({}); useEffect(() => { let live = true; const load = async () => { const [contentResult, settingsResult] = await Promise.all([supabase.from("content").select("id,title,description,type,category,meta,badge,artwork_class,featured,video_src,home_section,section_order,display_order,poster_url,hero_url,subtitles_url,episodes").eq("published", true).order("featured", { ascending: false }).order("updated_at", { ascending: false }), supabase.from("app_settings").select("key,value")]); if (!live) return; if (!contentResult.error && contentResult.data?.length) { const signed = await Promise.all((contentResult.data as DatabaseContent[]).map(async (item) => { if (!item.video_src?.startsWith("creator-film-media:")) return item; const path = item.video_src.slice("creator-film-media:".length); const { data } = await supabase.storage.from("creator-film-media").createSignedUrl(path, 60 * 60); return { ...item, video_src: data?.signedUrl ?? null } })); if (live) setContent(signed.map(mapContent)); } if (settingsResult.data) setSettings(Object.fromEntries(settingsResult.data.map((setting) => [setting.key, setting.value]))); setLoading(false) }; void load(); const channel = supabase.channel("public-content-live").on("postgres_changes", { event: "*", schema: "public", table: "content" }, load).on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, load).subscribe(); return () => { live = false; void supabase.removeChannel(channel) } }, []); const value = useMemo(() => { const grouped = group(content); return { content, rows: grouped.rows.length ? grouped.rows : fallbackRows, featured: grouped.featured, loading, settings } }, [content, loading, settings]); return <ContentContext.Provider value={value}>{children}</ContentContext.Provider> }
