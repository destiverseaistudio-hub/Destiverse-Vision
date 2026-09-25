import { supabase } from "@/lib/supabase"

type UploadOptions = { cacheControl?: string; contentType?: string; upsert?: boolean }

// Retrying transient gateway/network failures keeps the selected file in the
// browser and avoids making people restart an upload because of a brief blip.
export async function uploadWithRetry(bucket: string, path: string, file: File, options: UploadOptions = {}) {
  let lastError: { message: string } | null = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, options)
    if (!error) return { error: null }
    lastError = error
    const transient = /520|gateway|network|fetch|timeout|temporar/i.test(error.message)
    if (!transient || attempt === 1) break
    await new Promise((resolve) => window.setTimeout(resolve, 800 * (attempt + 1)))
  }
  return { error: lastError ?? { message: "Upload could not be completed." } }
}
