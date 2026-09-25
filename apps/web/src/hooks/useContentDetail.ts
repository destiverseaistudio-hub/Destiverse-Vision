import { useCallback, useEffect, useRef, useState } from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useContent } from "@/contexts/ContentContext"
import type { ContentItem } from "@/data/content"
import { supabase } from "@/lib/supabase"
import {
  getWatchProgress,
  saveWatchProgress,
  setWatchlistState,
} from "@/services/library"
import { trackContentEvent } from "@/services/analytics"

const PROGRESS_SAVE_INTERVAL_MS = 5000

export type UseContentDetailResult = {
  content: ContentItem | undefined
  relatedContent: ContentItem[]
  isComingSoon: boolean
  session: ReturnType<typeof useAuth>["session"]
  showPlayer: boolean
  openPlayer: () => void
  closePlayer: () => void
  isSaved: boolean
  libraryBusy: boolean
  watchlistError: string
  toggleWatchlist: () => Promise<void>
  resumePosition: number
  saveProgress: (positionSeconds: number, durationSeconds: number) => void
  persistProgress: (positionSeconds: number, durationSeconds: number) => void
  resetResumePosition: () => void
  playerSectionRef: React.RefObject<HTMLElement | null>
}

function getRelatedContent(item: ContentItem, allContent: ContentItem[]) {
  const sameCategory = allContent.filter(
    (candidate) =>
      candidate.id !== item.id && candidate.category === item.category,
  )

  const fallback = allContent.filter(
    (candidate) =>
      candidate.id !== item.id && candidate.category !== item.category,
  )

  return [...sameCategory, ...fallback].slice(0, 5)
}

export function useContentDetail(contentId?: string): UseContentDetailResult {
  const { session } = useAuth()
  const { content: allContent } = useContent()
  const content = contentId
    ? allContent.find((item) => item.id === contentId)
    : undefined

  const [showPlayer, setShowPlayer] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [libraryBusy, setLibraryBusy] = useState(false)
  const [watchlistError, setWatchlistError] = useState("")
  const [resumePosition, setResumePosition] = useState(0)
  const lastProgressSave = useRef(0)
  const playerSectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (content) void trackContentEvent(content.id, "view")
  }, [content])

  const contentIdForWatchlist = content?.id
  useEffect(() => {
    let active = true
    async function loadSavedState() {
      if (!contentIdForWatchlist || !session) {
        if (active) setIsSaved(false)
        return
      }

      const result = await supabase
        .from("watchlist_items")
        .select("content_id")
        .eq("content_id", contentIdForWatchlist)
        .maybeSingle()

      if (active) {
        setIsSaved(Boolean(result.data))
      }
    }

    void loadSavedState()

    return () => {
      active = false
    }
  }, [contentIdForWatchlist, session])

  const contentIdForProgress = content?.id
  useEffect(() => {
    if (!contentIdForProgress) return
    let active = true
    async function loadResumePosition() {
      if (!contentIdForProgress) return
      try {
        const entries = await getWatchProgress()

        const entry = entries.find(
          (candidate) => candidate.content_id === contentIdForProgress,
        )

        const nextPosition =
          entry &&
          entry.position_seconds > 0 &&
          entry.duration_seconds > 0 &&
          entry.position_seconds < entry.duration_seconds - 3
            ? entry.position_seconds
            : 0
        if (active) {
          setResumePosition(nextPosition)
        }
      } catch {
        if (active) {
          setResumePosition(0)
        }
      }
    }

    void loadResumePosition()

    return () => {
      active = false
    }
  }, [contentIdForProgress])

  const openPlayer = useCallback(() => {
    setShowPlayer(true)

    if (content) {
      void trackContentEvent(content.id, "play_start")
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        playerSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      })
    })
  }, [content])

  const closePlayer = useCallback(() => {
    setShowPlayer(false)
  }, [])

  const toggleWatchlist = useCallback(async () => {
    if (!content || !session) return

    setLibraryBusy(true)
    setWatchlistError("")
    try {
      await setWatchlistState(content.id, !isSaved)
      setIsSaved((saved) => !saved)
    } catch (error) {
      const databaseMessage = typeof error === "object" && error && "message" in error && typeof error.message === "string" ? error.message : "Could not update your watchlist."
      setWatchlistError(databaseMessage)
    } finally {
      setLibraryBusy(false)
    }
  }, [content, session, isSaved])

  const saveProgress = useCallback(
    (positionSeconds: number, durationSeconds: number) => {
      if (!content) return

      const now = Date.now()
      if (now - lastProgressSave.current >= PROGRESS_SAVE_INTERVAL_MS) {
        lastProgressSave.current = now
        void saveWatchProgress(content.id, positionSeconds, durationSeconds)
      }
    },
    [content],
  )

  const persistProgress = useCallback(
    (positionSeconds: number, durationSeconds: number) => {
      if (!content) return
      void saveWatchProgress(content.id, positionSeconds, durationSeconds)
    },
    [content],
  )

  const resetResumePosition = useCallback(() => {
    setResumePosition(0)
  }, [])

  return {
    content,
    relatedContent: content ? getRelatedContent(content, allContent) : [],
    isComingSoon: content?.badge === "Coming Soon",
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
  }
}
