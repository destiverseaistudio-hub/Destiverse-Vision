import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  Maximize,
  Minimize,
  PanelTopOpen,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react"
import type { ContentItem, Episode } from "@/data/content"

type VideoPlayerProps = {
  src?: string
  posterClassName?: string
  title?: string
  className?: string
  autoPlay?: boolean
  resumePosition?: number
  onProgress?: (positionSeconds: number, durationSeconds: number) => void
  onPause?: (positionSeconds: number, durationSeconds: number) => void
  onEnded?: (positionSeconds: number, durationSeconds: number) => void
  pausedForInterstitial?: boolean
  resumeAfterInterstitial?: number
  subtitlesUrl?: string
  episodes?: Episode[]
  currentEpisode?: Episode
  onSelectEpisode?: (episode: Episode) => void
  contentItem?: ContentItem
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00"
  }

  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`
}

export default function VideoPlayer({
  src,
  posterClassName = "",
  title = "DestiVerse video",
  className = "",
  autoPlay = false,
  resumePosition = 0,
  onProgress,
  onPause,
  onEnded,
  pausedForInterstitial = false,
  resumeAfterInterstitial = 0,
  subtitlesUrl,
  episodes,
  currentEpisode,
  onSelectEpisode,
}: VideoPlayerProps) {
  const preferences = (() => {
    try { return JSON.parse(localStorage.getItem("destiverse-viewer-preferences") || "{}") as { reducedData?: boolean } } catch { return {} }
  })()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const callbacksRef = useRef({
    onProgress,
    onPause,
    onEnded,
  })

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(Boolean(src))
  const [hasError, setHasError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPortraitVideo, setIsPortraitVideo] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showShortcutGuide, setShowShortcutGuide] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [focusMode, setFocusMode] = useState(false)
  const [bufferedPercent, setBufferedPercent] = useState(0)
  const [mediaQuality, setMediaQuality] = useState("")
  const [activeSubtitleTrack] = useState<string>("off")
  const [dismissedNextCountdown] = useState(false)

  const nextEpisode = useMemo(() => {
    if (!episodes || !currentEpisode) return undefined
    const currentIndex = episodes.findIndex((e) => e.id === currentEpisode.id)
    return currentIndex >= 0 && currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : undefined
  }, [episodes, currentEpisode])

  const canUsePictureInPicture = "pictureInPictureEnabled" in document && document.pictureInPictureEnabled
  const controlsTimerRef = useRef<number | null>(null)
  const lastTapRef = useRef({ time: 0, x: 0 })
  const previousResumeSignal = useRef(resumeAfterInterstitial)
  function clearControlsTimer() {
    if (controlsTimerRef.current !== null) {
      window.clearTimeout(controlsTimerRef.current)
      controlsTimerRef.current = null
    }
  }

  function scheduleControlsHide() {
    clearControlsTimer()

    controlsTimerRef.current = Number(
      window.setTimeout(() => {
        const video = videoRef.current
        if (video && !video.paused && !video.ended) {
          setShowControls(false)
        }
      }, 3000),
    )
  }

  function revealControls() {
    setShowControls(true)

    const video = videoRef.current

    if (video && !video.paused && !video.ended) {
      scheduleControlsHide()
    } else {
      clearControlsTimer()
    }
  }

  useEffect(() => {
    callbacksRef.current = {
      onProgress,
      onPause,
      onEnded,
    }
  }, [onProgress, onPause, onEnded])

  // Reset playback state when the selected source changes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setHasError(false)
    setIsLoading(Boolean(src))
    setShowControls(true)
    setIsPortraitVideo(false)
    clearControlsTimer()
  }, [src])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (pausedForInterstitial && videoRef.current && !videoRef.current.paused) videoRef.current.pause()
  }, [pausedForInterstitial])

  useEffect(() => {
    if (resumeAfterInterstitial > previousResumeSignal.current && videoRef.current && src) {
      void videoRef.current.play().catch(() => { /* Playback still requires a user gesture in some browsers. */ })
    }
    previousResumeSignal.current = resumeAfterInterstitial
  }, [resumeAfterInterstitial, src])

  useEffect(() => {
    const video = videoRef.current

    if (
      !video ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !Number.isFinite(resumePosition) ||
      resumePosition <= 0 ||
      resumePosition >= duration - 3
    ) {
      return
    }

    if (Math.abs(video.currentTime - resumePosition) > 1) {
      video.currentTime = resumePosition
      setCurrentTime(resumePosition)
    }
  }, [duration, resumePosition])

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      )
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT") return
      const video = videoRef.current
      if (!video || !src || hasError) return
      if (event.key === " " || event.key.toLowerCase() === "k") {
        event.preventDefault()
        togglePlayback()
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        seekBy(-10)
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        seekBy(10)
      } else if (event.key.toLowerCase() === "m") {
        event.preventDefault()
        toggleMute()
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault()
        void toggleFullscreen()
      } else if (event.key === "?") {
        event.preventDefault()
        setShowShortcutGuide((visible) => !visible)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  // Player command functions intentionally read the current media ref; re-binding on each render is unnecessary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, hasError])

  useEffect(() => {
    return () => {
      clearControlsTimer()
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    return () => {
      if (!video || video.currentTime <= 0) {
        return
      }

      const videoDuration = video.duration
      if (!Number.isFinite(videoDuration) || videoDuration <= 0) {
        return
      }

      callbacksRef.current.onProgress?.(
        video.currentTime,
        videoDuration,
      )
    }
  }, [src])

  function togglePlayback() {
    const video = videoRef.current

    if (!video || !src || hasError) {
      return
    }

    if (video.paused) {
      void video.play().catch(() => {
        setHasError(true)
        setIsPlaying(false)
      })
    } else {
      video.pause()
    }
  }

  function handleSeek(value: number) {
    const video = videoRef.current

    if (!video || !Number.isFinite(video.duration)) {
      return
    }

    video.currentTime = value
    setCurrentTime(value)
  }

  function toggleMute() {
    const video = videoRef.current

    if (!video) {
      return
    }

    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  function seekBy(seconds: number) {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    const nextTime = Math.min(video.duration, Math.max(0, video.currentTime + seconds))
    video.currentTime = nextTime
    setCurrentTime(nextTime)
    revealControls()
  }

  function changePlaybackRate(rate: number) {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    setPlaybackRate(rate)
  }

  async function togglePictureInPicture() {
    const video = videoRef.current
    if (!video || !canUsePictureInPicture) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await video.requestPictureInPicture()
    } catch { /* Browser support or user permissions may prevent Picture-in-Picture. */ }
  }

  function retryPlayback() {
    const video = videoRef.current
    if (!video) return
    setHasError(false)
    setIsLoading(true)
    video.load()
  }

  function handleStageTap(event: React.TouchEvent<HTMLDivElement>) {
    const now = Date.now()
    const x = event.changedTouches[0]?.clientX ?? 0
    const isDoubleTap = now - lastTapRef.current.time < 280 && Math.abs(x - lastTapRef.current.x) < 80
    lastTapRef.current = { time: now, x }
    if (!isDoubleTap) return
    const bounds = event.currentTarget.getBoundingClientRect()
    seekBy(x < bounds.left + bounds.width / 2 ? -10 : 10)
  }

  function handleStageClick() {
    // A tap/click on the video background should always bring controls back.
    // It deliberately does not change playback, so exploring controls cannot
    // interrupt a film while it is buffering or playing.
    revealControls()
  }

  function toggleFocusMode() {
    setFocusMode((current) => !current)
    revealControls()
  }

  async function toggleFullscreen() {
    const container = containerRef.current

    if (!container) {
      return
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await container.requestFullscreen()
  }

  const progressPercent =
    duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0

  return (
    <section
      ref={containerRef}
      className={`relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_70px_rgba(0,0,0,0.55)] fullscreen:flex fullscreen:items-center fullscreen:rounded-none ${focusMode ? "fixed inset-0 z-[100] flex items-center rounded-none border-0 bg-[#030304] p-0 sm:p-6" : ""} ${className}`}
      aria-label={title}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      onFocusCapture={revealControls}
    >
      {!src ? (
        <div
          className={`relative flex aspect-video items-center justify-center ${posterClassName}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-black/20 to-black/70" />

          <div className="relative z-10 mx-auto max-w-sm px-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60">
              <Play className="h-6 w-6 fill-current" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Playback unavailable
            </p>

            <p className="mt-2 text-sm leading-6 text-white/55">
              A video source has not been configured for this title yet.
            </p>
          </div>
        </div>
      ) : (
        <div
          onTouchEnd={handleStageTap}
          onClick={handleStageClick}
          style={!focusMode ? isPortraitVideo
            ? { width: "min(100%, 42.5dvh)", aspectRatio: "9 / 14" }
            : { width: "min(100%, 106.67dvh)", aspectRatio: "16 / 9" }
            : undefined}
          className={`relative min-w-0 max-w-full overflow-hidden bg-black fullscreen:aspect-video ${focusMode ? "mx-auto w-full max-w-[min(100%,1600px)] rounded-none sm:rounded-2xl shadow-[0_0_100px_rgba(229,9,20,.12)]" : "mx-auto"}`}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-contain"
            src={src}
            playsInline
            preload={preferences.reducedData ? "none" : "metadata"}
            autoPlay={autoPlay}
            aria-label={title}
            onLoadStart={() => {
              setIsLoading(true)
              setHasError(false)
            }}
            onLoadedMetadata={(event) => {
              setDuration(event.currentTarget.duration)
              const height = event.currentTarget.videoHeight
              setMediaQuality(height ? `${height >= 2160 ? "4K" : height >= 1440 ? "2K" : height >= 1080 ? "HD" : "SD"} • ${height}p` : "")
              setIsPortraitVideo(
                event.currentTarget.videoHeight > event.currentTarget.videoWidth,
              )
              setIsLoading(false)
            }}
            onCanPlay={() => setIsLoading(false)}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => {
              setIsPlaying(true)
              setIsLoading(false)
              scheduleControlsHide()
            }}
            onPause={(event) => {
              setIsPlaying(false)
              setShowControls(true)
              clearControlsTimer()

              callbacksRef.current.onPause?.(
                event.currentTarget.currentTime,
                event.currentTarget.duration,
              )
            }}
            onTimeUpdate={(event) => {
              setCurrentTime(event.currentTarget.currentTime)

              const buffered = event.currentTarget.buffered
              if (buffered.length && event.currentTarget.duration) {
                setBufferedPercent(Math.min(100, buffered.end(buffered.length - 1) / event.currentTarget.duration * 100))
              }


              callbacksRef.current.onProgress?.(
                event.currentTarget.currentTime,
                event.currentTarget.duration,
              )
            }}
            onEnded={(event) => {
              setIsPlaying(false)
              setCurrentTime(event.currentTarget.duration)
              setShowControls(true)
              clearControlsTimer()

              if (nextEpisode && !dismissedNextCountdown) {
                onSelectEpisode?.(nextEpisode)
              }

              callbacksRef.current.onEnded?.(
                event.currentTarget.currentTime,
                event.currentTarget.duration,
              )
            }}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
              setIsPlaying(false)
              setShowControls(true)
              clearControlsTimer()
            }}
          >
            {subtitlesUrl ? <track kind="subtitles" src={subtitlesUrl} srcLang="en" label="English" default={activeSubtitleTrack === "en"} /> : null}
            <track kind="subtitles" src="data:text/vtt;charset=utf-8,WEBVTT" srcLang="fr" label="Français" default={activeSubtitleTrack === "fr"} />
            <track kind="subtitles" src="data:text/vtt;charset=utf-8,WEBVTT" srcLang="yo" label="Yorùbá" default={activeSubtitleTrack === "yo"} />
            <track kind="subtitles" src="data:text/vtt;charset=utf-8,WEBVTT" srcLang="sw" label="Kiswahili" default={activeSubtitleTrack === "sw"} />
            <track kind="subtitles" src="data:text/vtt;charset=utf-8,WEBVTT" srcLang="ha" label="Hausa" default={activeSubtitleTrack === "ha"} />
            <track kind="subtitles" src="data:text/vtt;charset=utf-8,WEBVTT" srcLang="pcm" label="Naija Pidgin" default={activeSubtitleTrack === "pcm"} />
          </video>

          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent transition-opacity ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 transition-opacity sm:p-5">
            <span className={`rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.18em] text-white/70 backdrop-blur-md transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>DestiVerse Cinema {mediaQuality ? `· ${mediaQuality}` : ""}</span>
            <button type="button" onClick={() => setShowShortcutGuide((visible) => !visible)} className={`pointer-events-auto rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] font-semibold text-white/70 backdrop-blur-md transition hover:bg-black/70 hover:text-white ${showControls ? "opacity-100" : "opacity-0"}`} aria-label="Show keyboard shortcuts">?</button>
          </div>

          {showShortcutGuide ? <aside className="absolute right-3 top-12 z-20 w-56 rounded-xl border border-white/10 bg-black/80 p-3 text-xs text-white/75 shadow-2xl backdrop-blur-xl sm:right-5 sm:top-16"><div className="mb-2 flex items-center justify-between"><strong className="text-white">Player shortcuts</strong><button type="button" onClick={() => setShowShortcutGuide(false)} className="text-white/50 hover:text-white" aria-label="Close shortcuts">×</button></div><div className="grid grid-cols-[1fr_auto] gap-y-1.5"><span>Play or pause</span><kbd>Space / K</kbd><span>Skip 10 seconds</span><kbd>← / →</kbd><span>Mute</span><kbd>M</kbd><span>Fullscreen</span><kbd>F</kbd></div></aside> : null}

          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          />

          {!hasError ? (
            <button
              type="button"
              onClick={togglePlayback}
              className={`absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-2xl backdrop-blur-md transition-opacity duration-200 hover:scale-105 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-16 sm:w-16 ${showControls ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
              aria-label={isPlaying ? "Pause video" : "Play video"}
          >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-current sm:h-7 sm:w-7" />
              ) : (
                <Play className="ml-0.5 h-6 w-6 fill-current sm:h-7 sm:w-7" />
              )}
            </button>
          ) : null}

          {isLoading ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
              <div className="rounded-full border border-white/10 bg-black/65 px-4 py-2 text-xs font-medium text-white/75 backdrop-blur-md">
                Loading video…
              </div>
            </div>
          ) : null}

          {hasError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75 px-6 text-center">
              <div className="max-w-sm">
                <AlertCircle className="mx-auto mb-3 h-7 w-7 text-white/55" />

                <p className="text-sm font-semibold text-white">
                  We couldn't play this video.
                </p>

                <p className="mt-1 text-xs leading-5 text-white/45">
                  The media source may be temporarily unavailable or unsupported.
                </p>
                <button type="button" onClick={retryPlayback} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"><RotateCcw className="size-3.5" /> Try again</button>
              </div>
            </div>
          ) : null}

          {!hasError ? (
            <div className={`absolute inset-x-0 bottom-0 px-3 pb-2 pt-8 transition-opacity duration-200 sm:px-5 sm:pb-4 ${showControls ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
              <div className="mb-2 min-w-0">
                <p className="truncate text-xs font-semibold text-white sm:text-sm">
                  {title}
                </p>

              </div>

              <div className="relative mb-3">
                <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/25" />

                <div className="pointer-events-none absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20" style={{ width: `${bufferedPercent}%` }} />

                <div
                  className="pointer-events-none absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white"
                  style={{ width: `${progressPercent}%` }}
                />

                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => handleSeek(Number(event.target.value))}
                  disabled={!duration}
                  aria-label="Seek video"
                  className="relative block h-4 w-full cursor-pointer appearance-none bg-transparent accent-white disabled:cursor-not-allowed disabled:opacity-40"
                />
              </div>

              <div className="mb-2 flex items-center justify-between px-0.5 text-[10px] font-medium tabular-nums text-white/60 sm:text-xs">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                <button type="button" disabled={!duration} onClick={() => seekBy(-10)} aria-label="Back 10 seconds" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"><SkipBack className="h-4 w-4 sm:h-5 sm:w-5" /><span className="sr-only">Back 10 seconds</span></button>
                <button
                  type="button"
                  onClick={togglePlayback}
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-10 sm:w-10"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
                  ) : (
                    <Play className="ml-0.5 h-4 w-4 fill-current sm:h-5 sm:w-5" />
                  )}
                </button>

                <button type="button" disabled={!duration} onClick={() => seekBy(10)} aria-label="Forward 10 seconds" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"><SkipForward className="h-4 w-4 sm:h-5 sm:w-5" /><span className="sr-only">Forward 10 seconds</span></button>

                <label className="sr-only" htmlFor="playback-speed">Playback speed</label>
                <select id="playback-speed" value={playbackRate} onChange={(event) => changePlaybackRate(Number(event.target.value))} className="h-9 max-w-16 rounded-md border border-white/10 bg-black/45 px-1 text-[10px] font-semibold text-white outline-none sm:h-10 sm:max-w-20 sm:text-xs" aria-label="Playback speed">
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
                </select>

                {canUsePictureInPicture ? <button type="button" onClick={() => void togglePictureInPicture()} aria-label="Picture in picture" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-10 sm:w-10"><PictureInPicture2 className="h-4 w-4 sm:h-5 sm:w-5" /></button> : null}

                <button type="button" onClick={toggleFocusMode} aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:flex sm:h-10 sm:w-10"><PanelTopOpen className="h-4 w-4 sm:h-5 sm:w-5" /></button>

                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-10 sm:w-10"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>

                <div className="flex-1" />

                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  aria-label={
                    isFullscreen
                      ? "Exit fullscreen"
                      : "Enter fullscreen"
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-10 sm:w-10"
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

