import { Link, useParams, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  ChevronRight,
  Info,
  Download,
  Play,
  Plus,
} from "lucide-react"
import { useEffect } from "react"

import ContentCard from "@/components/content/ContentCard"
import ContentDetailPlayer from "@/components/content/ContentDetailPlayer"
import { useContentDetail } from "@/hooks/useContentDetail"

export default function ContentDetailPage() {
  const { contentId } = useParams<{ contentId: string }>()
  const [searchParams] = useSearchParams()
  const {
    content,
    relatedContent,
    isComingSoon,
    session,
    showPlayer,
    openPlayer,
    closePlayer,
    isSaved,
    libraryBusy,
    watchlistError,
    toggleWatchlist,
    resumePosition,
    saveProgress,
    persistProgress,
    resetResumePosition,
    playerSectionRef,
  } = useContentDetail(contentId)

  const playParam = searchParams.get("play")
  const downloadName = content ? `${content.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "destiverse-video"}.mp4` : "destiverse-video.mp4"
  const downloadUrl = content?.videoSrc ? `${content.videoSrc}${content.videoSrc.includes("?") ? "&" : "?"}download=${encodeURIComponent(downloadName)}` : ""

  useEffect(() => {
    if (playParam === "1") {
      openPlayer()
    }
    // Only react to the initial play query param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playParam])

  if (!content) {
    return (
      <main className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[60vh] max-w-[var(--dv-content-max-width)] items-center justify-center">
          <section className="w-full max-w-xl rounded-3xl border-[var(--dv-border)] bg-[var(--dv-surface)] p-8 text-center shadow-[var(--dv-shadow-card)] sm:p-12">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-white/60">
              <Info className="h-6 w-6" />
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Content unavailable
            </p>

            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              We couldn't find that title.
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/50">
              The content may have moved or is not available in the current
              catalog.
            </p>

            <Link
              to="/dashboard/categories"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Browse content
              <ChevronRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="w-full min-w-0 overflow-x-hidden pb-16">
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div
          className={`absolute inset-0 ${content.artworkClass} ${content.heroUrl ? "bg-cover bg-center" : ""}`}
          style={content.heroUrl ? { backgroundImage: `url(${content.heroUrl})` } : undefined}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#070707] via-[#070707]/90 to-[#070707]/55"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/35 to-transparent"
          aria-hidden="true"
        />

        <div className="relative mx-auto w-full min-w-0 max-w-[var(--dv-content-max-width)] px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <Link
            to="/dashboard/categories"
            className="mb-8 inline-flex items-center gap-2 rounded-full border-white/10 bg-black/30 px-3.5 py-2 text-xs font-medium text-white/70 backdrop-blur-md transition hover:border-white/20 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to browse
          </Link>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 max-w-3xl">
              {content.badge ? (
                <span className="mb-4 inline-flex rounded-full border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 backdrop-blur-md">
                  {content.badge}
                </span>
              ) : null}

              <h1 className="break-words text-2xl font-black leading-[1.08] tracking-[-0.03em] text-white sm:text-4xl md:text-5xl lg:text-6xl">
                {content.title}
              </h1>

              <div className="mt-5 flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-white/55 sm:text-sm">
                <span>{content.type}</span>
                <span className="text-white/20">•</span>
                <span>{content.category}</span>
                <span className="text-white/20">•</span>
                <span>{content.meta}</span>
              </div>

              <p className="min-w-0 max-w-2xl break-words mt-6 text-sm leading-7 text-white/65 sm:text-base sm:leading-8">
                {content.description}
              </p>

              <div className="mt-6 flex-col gap-3 xs:flex-row sm:mt-7 sm:flex-row">
                <button
                  type="button"
                  disabled={isComingSoon}
                  onClick={openPlayer}
                  className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition sm:w-auto ${
                    isComingSoon
                      ? "cursor-not-allowed bg-white/60 text-black/60"
                      : "bg-white text-black hover:bg-white/90"
                  }`}
                  title={
                    isComingSoon
                      ? "This title is not available yet."
                      : "Open the video player."
                  }
                >
                  <Play className="h-4 w-4 fill-current" />
                  {isComingSoon ? "Coming Soon" : "Watch"}
                </button>

                {content.videoSrc && !isComingSoon ? <a href={downloadUrl} download={downloadName} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10 sm:mt-0 sm:ml-2 sm:w-auto" title="Download this video to your device"><Download className="h-4 w-4" /> Download</a> : null}

                <button
                  type="button"
                  disabled={!session || libraryBusy}
                  onClick={() => void toggleWatchlist()}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  title={!session ? "Sign in to use your watchlist." : undefined}
                >
                  <Plus className="h-4 w-4" />
                  {isSaved ? "Saved" : "Add to Watchlist"}
                </button>
                {watchlistError ? <p role="alert" className="mt-2 text-sm text-red-300">{watchlistError}</p> : null}
              </div>
            </div>

            <div className="mx-auto w-full max-w-[280px] lg:max-w-none">
              <div
                className={`relative aspect-[2/3] overflow-hidden rounded-3xl border-white/10 shadow-2xl ${content.artworkClass} ${content.posterUrl ? "bg-cover bg-center" : ""}`}
                style={content.posterUrl ? { backgroundImage: `url(${content.posterUrl})` } : undefined}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    {content.category}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {content.type}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showPlayer ? (
        <ContentDetailPlayer
          content={content}
          resumePosition={resumePosition}
          sectionRef={playerSectionRef}
          onClose={closePlayer}
          onProgress={saveProgress}
          onPause={persistProgress}
          onEnded={() => {
            persistProgress(0, 0)
            resetResumePosition()
          }}
        />
      ) : null}

      <section className="mx-auto max-w-[var(--dv-content-max-width)] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Discover more
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              More like this
            </h2>
          </div>

          <Link
            to="/dashboard/categories"
            className="hidden items-center gap-1 text-xs font-medium text-white/45 transition hover:text-white sm:inline-flex"
          >
            Browse all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {relatedContent.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5">
            {relatedContent.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-[var(--dv-border)] bg-[var(--dv-surface)] p-8 text-center text-sm text-white/45">
            More titles will appear here as the catalog grows.
          </div>
        )}
      </section>
    </main>
  )
}
