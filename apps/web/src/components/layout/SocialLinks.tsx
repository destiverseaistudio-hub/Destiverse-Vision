import { AtSign, CirclePlay, MessageCircle, Music2, UsersRound } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useContent } from "@/contexts/ContentContext"

type SocialLink = { label: string; setting: string; Icon: LucideIcon }

const socialLinks: SocialLink[] = [
  { label: "Instagram", setting: "instagram_url", Icon: AtSign },
  { label: "Facebook", setting: "facebook_url", Icon: UsersRound },
  { label: "YouTube", setting: "youtube_url", Icon: CirclePlay },
  { label: "TikTok", setting: "tiktok_url", Icon: Music2 },
  { label: "X", setting: "x_url", Icon: AtSign },
  { label: "WhatsApp Channel", setting: "whatsapp_channel_url", Icon: MessageCircle },
]

function safeExternalUrl(value: string | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null
  } catch {
    return null
  }
}

export default function SocialLinks() {
  const { settings } = useContent()
  const visibleLinks = socialLinks.flatMap(({ setting, ...link }) => {
    const href = safeExternalUrl(settings[setting])
    return href ? [{ ...link, href }] : []
  })

  if (!visibleLinks.length) return null

  return <nav className="flex flex-wrap items-center gap-2" aria-label="Follow DestiVerse Vision">
    {visibleLinks.map(({ label, Icon, href }) => <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`Follow DestiVerse Vision on ${label}`} title={label} className="inline-flex size-8 items-center justify-center rounded-full border border-white/15 text-white/65 transition hover:border-[var(--dv-accent)] hover:text-white"><Icon size={16} /></a>)}
  </nav>
}
