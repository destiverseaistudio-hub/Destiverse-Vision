import { useEffect, useState } from "react"
import AdCreative from "@/components/ads/AdCreative"
import { getAdCampaigns, rememberAdImpression, recordAdEvent, viewerHasAdFreeAccess, type AdCampaign, type AdFormat, type AdPlacement } from "@/services/ads"

export default function AdSlot({ placement, format }: { placement: AdPlacement; format: Extract<AdFormat, "banner" | "ribbon" | "popup"> }) {
  const [campaign, setCampaign] = useState<AdCampaign | null>(null)
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    let live = true
    void (async () => {
      if (format === "popup" && sessionStorage.getItem("dv-popup-ad-seen")) return
      const ads = await getAdCampaigns(placement, format, await viewerHasAdFreeAccess())
      const chosen = ads[0]
      if (!live || !chosen) return
      setCampaign(chosen); rememberAdImpression(chosen); void recordAdEvent(chosen.id, "impression")
    })()
    return () => { live = false }
  }, [placement, format])
  if (!campaign || dismissed) return null
  const close = () => { setDismissed(true); if (format === "popup") sessionStorage.setItem("dv-popup-ad-seen", "1") }
  if (format === "popup") return <div className="fixed inset-0 z-[90] grid place-items-end bg-black/55 p-4 sm:place-items-center" role="dialog" aria-label="Sponsored offer"><div className="w-full max-w-md"><AdCreative campaign={campaign} onDismiss={close} /></div></div>
  if (format === "ribbon") return <div className="sticky top-0 z-40 px-2 pt-2 sm:px-4"><AdCreative campaign={campaign} onDismiss={close} compact /></div>
  return <div className="mx-4 mt-5 sm:mx-6 lg:mx-8"><AdCreative campaign={campaign} compact /></div>
}
