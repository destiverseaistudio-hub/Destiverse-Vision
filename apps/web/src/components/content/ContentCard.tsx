import { Link } from "react-router-dom"
import { ArrowRight, Play } from "lucide-react"
import { useState } from "react"
import type { ContentItem } from "@/data/content"
import { cn } from "@/lib/utils"

type ContentCardProps = {
  item: ContentItem
  className?: string
}

function ContentCard({ item, className }: ContentCardProps) {
  const [prevKey, setPrevKey] = useState(`${item.id}:${item.posterUrl ?? ""}:${item.videoSrc ?? ""}`)
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | "unknown">("unknown")
  const currentKey = `${item.id}:${item.posterUrl ?? ""}:${item.videoSrc ?? ""}`

  if (currentKey !== prevKey) {
    setPrevKey(currentKey)
    setOrientation("unknown")
  }

  const detectImageOrientation = (image: HTMLImageElement) => {
    if (image.naturalWidth && image.naturalHeight) setOrientation(image.naturalWidth > image.naturalHeight ? "landscape" : "portrait")
  }
  const detectVideoOrientation = (video: HTMLVideoElement) => {
    if (video.videoWidth && video.videoHeight) setOrientation(video.videoWidth > video.videoHeight ? "landscape" : "portrait")
  }

  return (
    <Link
      to={`/dashboard/content/${item.id}`}
      className={cn(
        "group block shrink-0",
        className ?? "w-[170px] sm:w-[190px] md:w-[205px]",
      )}
      aria-label={`Open ${item.title}`}
    >
      <article className="overflow-hidden rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] bg-[var(--dv-surface)] shadow-[var(--dv-shadow-card)] transition duration-300 group-hover:-translate-y-1 group-hover:border-white/20 group-hover:bg-white/[0.07]">
        <div
          className={`relative overflow-hidden ${orientation === "landscape" ? "aspect-video" : "aspect-[2/3]"} ${item.artworkClass}`}
          style={item.posterUrl ? { backgroundImage: `url(${item.posterUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}
        >
          {item.posterUrl ? <img src={item.posterUrl} alt="" aria-hidden="true" onLoad={(event) => detectImageOrientation(event.currentTarget)} className="pointer-events-none absolute size-px opacity-0" /> : item.videoSrc ? <video src={item.videoSrc} preload="metadata" muted playsInline onLoadedMetadata={(event) => detectVideoOrientation(event.currentTarget)} className="pointer-events-none absolute size-px opacity-0" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20" />

          {item.badge ? (
            <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
              {item.badge}
            </span>
          ) : null}

          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-xl">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </span>

          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
              {item.type}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 p-3">
          <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-5 text-white">
            {item.title}
          </h3>

          <div className="flex items-center justify-between gap-2 text-xs text-white/45">
            <span className="truncate">{item.meta}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </article>
    </Link>
  )
}
export { ContentCard }
export default ContentCard
