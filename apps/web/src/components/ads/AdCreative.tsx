import { ExternalLink, X } from "lucide-react"
import type { AdCampaign } from "@/services/ads"
import { recordAdEvent } from "@/services/ads"

type Props = { campaign: AdCampaign; onDismiss?: () => void; compact?: boolean }

export default function AdCreative({ campaign, onDismiss, compact = false }: Props) {
  const follow = () => {
    void recordAdEvent(campaign.id, "click")
    if (campaign.cta_url) window.open(campaign.cta_url, "_blank", "noopener,noreferrer")
  }
  return <aside className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#151518] shadow-2xl ${compact ? "p-3 sm:p-4" : "p-5 sm:p-6"}`} aria-label="Sponsored content">
    {campaign.media_url ? <img src={campaign.media_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" /> : null}
    <div className="absolute inset-0 bg-gradient-to-r from-[#151518] via-[#151518]/90 to-[#151518]/55" />
    <div className="relative flex min-w-0 items-center gap-3">
      <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-white/45">Sponsored</p><h3 className={`mt-1 truncate font-bold text-white ${compact ? "text-sm" : "text-lg"}`}>{campaign.headline}</h3>{campaign.body ? <p className={`mt-1 line-clamp-2 text-white/60 ${compact ? "text-xs" : "text-sm"}`}>{campaign.body}</p> : null}</div>
      {campaign.cta_url ? <button type="button" onClick={follow} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-black transition hover:bg-white/90">{campaign.cta_label}<ExternalLink className="size-3" /></button> : null}
      {onDismiss ? <button type="button" onClick={onDismiss} className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/45 text-white/75 hover:bg-black/70" aria-label="Close sponsored content"><X className="size-4" /></button> : null}
    </div>
  </aside>
}
