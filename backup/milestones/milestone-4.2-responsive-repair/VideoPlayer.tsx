import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react"

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
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00"
  }

  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

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
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(Boolean(src))
  const [hasError, setHasError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setHasError(false)
    setIsLoading(Boolean(src))
  }, [src])

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

  return (
    <section
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl ${className}`}
      aria-label={title}
    >
      {!src ? (
        <div
          className={`relative flex aspect-video items-center justify-center ${posterClassName}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-black/20 to-black/70" />

          <div className="relative z-10 mx-auto max-w-sm px-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/55">
              <Play className="h-5 w-5" />
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
        <>
          <div className="relative aspect-video bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-contain"
              src={src}
              playsInline
              preload="metadata"
              autoPlay={autoPlay}
              aria-label={title}
              onLoadStart={() => {
                setIsLoading(true)
                setHasError(false)
              }}
              onLoadedMetadata={(event) => {
                const video = event.currentTarget
                const nextDuration = video.duration

                setDuration(nextDuration)
                setIsLoading(false)

                if (
                  Number.isFinite(resumePosition) &&
                  resumePosition > 0 &&
                  Number.isFinite(nextDuration) &&
                  nextDuration > 0 &&
                  resumePosition < nextDuration - 3
                ) {
                  video.currentTime = resumePosition
                  setCurrentTime(resumePosition)
                }
              }}
              onCanPlay={() => setIsLoading(false)}
              onWaiting={() => setIsLoading(true)}
              onPlaying={() => {
                setIsPlaying(true)
                setIsLoading(false)
              }}
              onPause={(event) => {
                setIsPlaying(false)
                onPause?.(
                  event.currentTarget.currentTime,
                  event.currentTarget.duration,
                )
              }}
              onTimeUpdate={(event) => {
                setCurrentTime(event.currentTarget.currentTime)
                onProgress?.(
                  event.currentTarget.currentTime,
                  event.currentTarget.duration,
                )
              }}
              onEnded={(event) => {
                setIsPlaying(false)
                setCurrentTime(event.currentTarget.duration)
                onEnded?.(
                  event.currentTarget.currentTime,
                  event.currentTarget.duration,
                )
              }}
              onError={() => {
                setIsLoading(false)
                setHasError(true)
                setIsPlaying(false)
              }}
            />

            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                <div className="rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs font-medium text-white/70 backdrop-blur-md">
                  Loading video…
                </div>
              </div>
            ) : null}

            {hasError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center">
                <div className="max-w-sm">
                  <AlertCircle className="mx-auto mb-3 h-6 w-6 text-white/55" />
                  <p className="text-sm font-semibold text-white">
                    We couldn't play this video.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/45">
                    The media source may be unavailable or unsupported.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/10 bg-black/90 px-3 py-3 sm:px-4">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => handleSeek(Number(event.target.value))}
              disabled={!duration || hasError}
              aria-label="Seek video"
              className="mb-3 h-1.5 w-full cursor-pointer accent-white disabled:cursor-not-allowed disabled:opacity-40"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={hasError}
                aria-label={isPlaying ? "Pause video" : "Play video"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute video" : "Mute video"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>

              <span className="min-w-[88px] text-xs font-medium tabular-nums text-white/55">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="flex-1" />

              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                aria-label={
                  isFullscreen
                    ? "Exit fullscreen"
                    : "Enter fullscreen"
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

