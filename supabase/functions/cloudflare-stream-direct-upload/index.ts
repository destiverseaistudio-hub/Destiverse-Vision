import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })
const allowedTypes = new Set(["video/mp4", "video/webm", "video/quicktime"])
const maximumUploadBytes = 65 * 1024 * 1024

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  const supabaseUrl = Deno.env.get("SUPABASE_URL"), anonKey = Deno.env.get("SUPABASE_ANON_KEY"), accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID"), token = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN"), authorization = request.headers.get("Authorization")
  if (!supabaseUrl || !anonKey || !accountId || !token || !authorization) return json({ error: "Cloudflare Stream uploads are not configured yet." }, 503)
  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: identity, error: identityError } = await supabase.auth.getUser()
  if (identityError || !identity.user) return json({ error: "Please sign in before uploading." }, 401)
  let input: { file_name?: string; file_size?: number; content_type?: string; max_duration_seconds?: number }
  try { input = await request.json() } catch { return json({ error: "Invalid upload request." }, 400) }
  if (!input.file_name?.trim() || !input.file_size || !input.content_type || !allowedTypes.has(input.content_type)) return json({ error: "Choose an MP4, WebM, or MOV video file." }, 400)
  if (input.file_size > maximumUploadBytes) return json({ error: "Choose a video smaller than 65 MB." }, 400)
  const [{ data: application }, { data: entitlement }] = await Promise.all([
    supabase.from("creator_applications").select("status").eq("user_id", identity.user.id).maybeSingle(),
    supabase.from("creator_plan_subscriptions").select("status,expires_at").eq("user_id", identity.user.id).maybeSingle(),
  ])
  if (application?.status !== "approved") return json({ error: "An approved creator account is required." }, 403)
  if (entitlement?.status !== "active" || new Date(entitlement.expires_at) <= new Date()) return json({ error: "An active Creator Pro plan is required for catalog uploads." }, 403)
  const duration = Math.max(60, Math.min(36_000, Math.floor(input.max_duration_seconds || 7_200)))
  const cloudflare = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ maxDurationSeconds: duration, creator: identity.user.id, requireSignedURLs: true, expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(), meta: { source: "destiverse-creator-film", filename: input.file_name.slice(0, 180) } }),
  })
  const payload = await cloudflare.json().catch(() => null)
  if (!cloudflare.ok || !payload?.success || !payload?.result?.uploadURL || !payload?.result?.uid) return json({ error: payload?.errors?.[0]?.message || "Cloudflare could not prepare this upload." }, 502)
  return json({ upload_url: payload.result.uploadURL, stream_uid: payload.result.uid, playback_url: `https://videodelivery.net/${payload.result.uid}/manifest/video.m3u8`, thumbnail_url: `https://videodelivery.net/${payload.result.uid}/thumbnails/thumbnail.jpg` })
})
