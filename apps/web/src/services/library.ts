import { supabase } from "@/lib/supabase"

const localWatchlistKey = "destiverse-local-watchlist"

function getLocalWatchlistIds() {
  try {
    const value = JSON.parse(window.localStorage.getItem(localWatchlistKey) ?? "[]")
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []
  } catch {
    return []
  }
}

function setLocalWatchlistIds(ids: string[]) {
  window.localStorage.setItem(localWatchlistKey, JSON.stringify([...new Set(ids)]))
}

export async function getWatchlistIds() {
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("content_id")
  if (error) throw error
  return [...new Set([...(data ?? []).map((item) => item.content_id), ...getLocalWatchlistIds()])]
}

export async function setWatchlistState(contentId: string, saved: boolean) {
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error("You must be signed in to use your watchlist.")

  if (saved) {
    const { error } = await supabase.from("watchlist_items").upsert({
      user_id: data.user.id,
      content_id: contentId,
    })
    if (error && error.code === "23503") {
      setLocalWatchlistIds([...getLocalWatchlistIds(), contentId])
      return
    }
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from("watchlist_items")
    .delete()
    .eq("user_id", data.user.id)
    .eq("content_id", contentId)
  setLocalWatchlistIds(getLocalWatchlistIds().filter((id) => id !== contentId))
  if (error && error.code === "23503") {
    return
  }
  if (error) throw error
}

export async function saveWatchProgress(
  contentId: string,
  positionSeconds: number,
  durationSeconds: number,
) {
  const { data } = await supabase.auth.getUser()
  if (!data.user || !durationSeconds) return

  const { error } = await supabase.from("watch_progress").upsert({
    user_id: data.user.id,
    content_id: contentId,
    position_seconds: positionSeconds,
    duration_seconds: durationSeconds,
    completed: positionSeconds / durationSeconds > 0.9,
  })

  if (error) {
    throw error
  }
}

export async function getWatchProgress() {
  const { data, error } = await supabase
    .from("watch_progress")
    .select("content_id,position_seconds,duration_seconds,completed,updated_at")
    .eq("completed", false)
    .order("updated_at", { ascending: false })
  if (error) throw error
  return data ?? []
}
