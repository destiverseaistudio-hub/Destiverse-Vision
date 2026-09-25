import type { UserProfile } from "@/types/profile"

import { supabase } from "@/lib/supabase"
import { uploadWithRetry } from "@/services/uploads"

export async function getMyProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return {
      data: null as UserProfile | null,
      error: userError,
    }
  }

  if (!user) {
    return {
      data: null as UserProfile | null,
      error: new Error("No authenticated user."),
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle()

  return {
    data: data as UserProfile | null,
    error,
  }
}

export async function updateMyProfile(
  updates: Pick<UserProfile, "display_name" | "avatar_url">,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return {
      data: null as UserProfile | null,
      error: userError,
    }
  }

  if (!user) {
    return {
      data: null as UserProfile | null,
      error: new Error("No authenticated user."),
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: updates.display_name,
      avatar_url: updates.avatar_url,
    })
    .eq("id", user.id)
    .select("id, display_name, avatar_url, created_at, updated_at")
    .single()

  return {
    data: data as UserProfile | null,
    error,
  }
}

export async function uploadMyAvatar(file: File) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { data: null, error: userError ?? new Error("No authenticated user.") }
  if (!file.type.startsWith("image/")) return { data: null, error: new Error("Choose an image file.") }
  if (file.size > 7 * 1024 * 1024) return { data: null, error: new Error("Image must be 7 MB or smaller.") }
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `${user.id}/avatar-${Date.now()}.${extension}`
  const { error } = await uploadWithRetry("profile-avatars", path, file, { cacheControl: "31536000", upsert: false })
  if (error) return { data: null, error }
  return { data: supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl, error: null }
}
