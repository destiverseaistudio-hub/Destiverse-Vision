import { useEffect, useState, type RefObject } from "react"
import { Download, X } from "lucide-react"

import VideoPlayer from "@/components/video/VideoPlayer"
import type { ContentItem } from "@/data/content"
import { getAdCampaigns, rememberAdImpression, recordAdEvent, viewerHasAdFreeAccess, type AdCampaign } from "@/services/ads"

type ContentDetailPlayerProps = {
  content: ContentItem
  resumePosition: number
  sectionRef: RefObject<HTMLElement | null>
  onClose: () => void
  onProgress: (positionSeconds: number, durationSeconds: number) => void
  onPause: (positionSeconds: number, durationSeconds: number) => void
  onEnded: () => void
}

export default function ContentDetailPlayer({
  content,
  resumePosition,
  sectionRef,
  onClose,
  onProgress,
  onPause,
  onEnded,
}: ContentDetailPlayerProps) {
  const [midRoll, setMidRoll] = useState<AdCampaign | null>(null)
  const [activeAd, setActiveAd] = useState<AdCampaign | null>(null)
  const [canSkip, setCanSkip] = useState(false)
  const [midRollShown, setMidRollShown] = useState(false)
  const [resumeSignal, setResumeSignal] = useState(0)
  const downloadName = `${content.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "destiverse-video"}.mp4`
  const downloadUrl = content.videoSrc ? `${content.videoSrc}${content.videoSrc.includes("?") ? "&" : "?"}download=${encodeURIComponent(downloadName)}` : ""

  useEffect(() => {
    let live = true
    void (async () => {
      const adFree = await viewerHasAdFreeAccess()
      const [pre, mid] = await Promise.all([getAdCampaigns("content", "pre_roll", adFree), getAdCampaigns("content", "mid_roll", adFree)])
      if (!live) return
      if (pre[0]) { setActiveAd(pre[0]); rememberAdImpression(pre[0]); void recordAdEvent(pre[0].id, "impression") }
      if (mid[0]) setMidRoll(mid[0])
    })()
    return () => { live = false }
  }, [content.id])

  const [prevAdId, setPrevAdId] = useState<string | null>(null)
  const currentAdId = activeAd?.id ?? null
  if (currentAdId !== prevAdId) {
    setPrevAdId(currentAdId)
    setCanSkip(Boolean(activeAd && activeAd.skip_after_seconds === 0))
  }

  useEffect(() => {
    if (!activeAd || activeAd.skip_after_seconds === 0) return
    const timer = window.setTimeout(() => setCanSkip(true), activeAd.skip_after_seconds * 1000)
    return () => window.clearTimeout(timer)
  }, [activeAd])

  const closeAd = (eventType: "skipped" | "complete" = "skipped") => {
    if (activeAd) void recordAdEvent(activeAd.id, eventType)
    setActiveAd(null)
    setResumeSignal((current) => current + 1)
  }

  return (
    <section
      ref={sectionRef}
      className="mx-auto w-full min-w-0 max-w-[var(--dv-content-max-width)] scroll-mt-20 px-3 pt-7 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10"
    >
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Now playing
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
            {content.title}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {content.videoSrc ? <a href={downloadUrl} download={downloadName} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white" title="Download this video to your device"><Download className="size-3.5" /> Download</a> : null}
          <button type="button" onClick={onClose} className="rounded-lg border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/60 transition hover:border-white/20 hover:text-white">Close player</button>
        </div>
      </div>

      <VideoPlayer
        src={content.videoSrc}
        posterClassName={content.artworkClass}
        title={content.title}
        subtitlesUrl={content.subtitlesUrl}
        autoPlay
        resumePosition={resumePosition}
        pausedForInterstitial={Boolean(activeAd)}
        resumeAfterInterstitial={resumeSignal}
        onProgress={(position, duration) => {
          onProgress(position, duration)
          if (midRoll && !midRollShown && position >= midRoll.midroll_at_seconds) {
            setMidRollShown(true); setActiveAd(midRoll); rememberAdImpression(midRoll); void recordAdEvent(midRoll.id, "impression")
          }
        }}
        onPause={onPause}
        onEnded={onEnded}
      />
      {activeAd ? <div className="fixed inset-0 z-[110] grid place-items-center bg-black/90 p-4" role="dialog" aria-label="Advertisement"><div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#121214] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/50">Sponsored video</span>{canSkip ? <button type="button" onClick={() => closeAd()} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10">Skip ad <X className="size-3.5" /></button> : <span className="text-xs text-white/50">Skip in {activeAd.skip_after_seconds}s</span>}</div>{activeAd.video_url ? <video className="aspect-video w-full bg-black object-contain" src={activeAd.video_url} autoPlay playsInline controls onEnded={() => closeAd("complete")} /> : <div className="p-6 sm:p-8"><h3 className="text-xl font-bold text-white">{activeAd.headline}</h3><p className="mt-2 text-sm leading-6 text-white/65">{activeAd.body}</p>{activeAd.cta_url ? <a href={activeAd.cta_url} target="_blank" rel="noreferrer" onClick={() => void recordAdEvent(activeAd.id, "click")} className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black">{activeAd.cta_label}</a> : null}</div>}</div></div> : null}
    </section>
  )
}
