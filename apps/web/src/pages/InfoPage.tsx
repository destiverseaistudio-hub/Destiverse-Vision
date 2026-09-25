import { Link } from "react-router-dom"
import { ContentProvider, useContent } from "@/contexts/ContentContext"

const pageInfo = {
  about: { title: "About DestiVerse Vision", key: "about_page" as const, fallback: "DestiVerse Vision brings together stories, entertainment, and creative experiences." },
  privacy: { title: "Privacy Policy", key: "privacy_policy" as const, fallback: "Our privacy policy will be published here." },
  terms: { title: "Terms of Service", key: "terms_of_service" as const, fallback: "Our terms of service will be published here." },
}

function InfoContent({ page }: { page: keyof typeof pageInfo }) {
  const { settings } = useContent()
  const info = pageInfo[page]
  return <main className="min-h-screen bg-[var(--dv-background)] px-4 py-10 text-white sm:px-6"><article className="mx-auto max-w-3xl"><Link to="/" className="text-sm text-white/60 hover:text-white">← Back to DestiVerse Vision</Link><p className="mt-10 text-xs font-bold uppercase tracking-[.2em] text-[var(--dv-accent)]">DestiVerse Vision</p><h1 className="mt-3 text-4xl font-black">{info.title}</h1><div className="mt-8 whitespace-pre-wrap text-sm leading-8 text-white/70">{settings[info.key] || info.fallback}</div></article></main>
}
export default function InfoPage({ page }: { page: keyof typeof pageInfo }) { return <ContentProvider><InfoContent page={page} /></ContentProvider> }
