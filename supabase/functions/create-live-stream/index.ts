import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY"), accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID"), token = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN"), authorization = request.headers.get("Authorization")
  if (!url || !key || !accountId || !token || !authorization) return json({ error: "Live streaming is not configured yet." }, 503)
  const supabase = createClient(url, key, { global: { headers: { Authorization: authorization } } })
  const { data: identity } = await supabase.auth.getUser()
  if (!identity.user) return json({ error: "Please sign in first." }, 401)
  const { data: application } = await supabase.from("creator_applications").select("status").eq("user_id", identity.user.id).maybeSingle()
  if (application?.status !== "approved") return json({ error: "An approved creator account is required to go live." }, 403)
  let input: { title?: string; description?: string }
  try { input = await request.json() } catch { return json({ error: "Invalid live-stream request." }, 400) }
  const title = input.title?.trim(), description = input.description?.trim() || ""
  if (!title || title.length < 3 || title.length > 120 || description.length > 500) return json({ error: "Enter a title between 3 and 120 characters." }, 400)
  const cloudflare = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ meta: { creator: identity.user.id, title }, recording: { mode: "automatic" } }) })
  const payload = await cloudflare.json().catch(() => null)
  if (!cloudflare.ok || !payload?.success || !payload?.result?.uid) return json({ error: payload?.errors?.[0]?.message || "Cloudflare could not create a live input." }, 502)
  const uid = payload.result.uid
  const { data: stream, error } = await supabase.from("creator_live_streams").insert({ creator_id: identity.user.id, title, description, stream_uid: uid, playback_url: `https://videodelivery.net/${uid}/manifest/video.m3u8`, thumbnail_url: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg` }).select("id,title,stream_uid,playback_url").single()
  if (error) return json({ error: error.message }, 500)
  return json({ stream, rtmps_url: payload.result.rtmps?.url || payload.result.rtmps?.url, stream_key: payload.result.rtmps?.streamKey || payload.result.rtmps?.key, srt_url: payload.result.srt?.url || null })
})
