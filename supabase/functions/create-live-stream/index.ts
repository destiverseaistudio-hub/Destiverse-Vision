import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY"), accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID"), cloudflareToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN"), livepeerToken = Deno.env.get("LIVEPEER_API_KEY"), authorization = request.headers.get("Authorization")
  if (!url || !key || !authorization || (!livepeerToken && (!accountId || !cloudflareToken))) return json({ error: "Live streaming is not configured yet." }, 503)
  const supabase = createClient(url, key, { global: { headers: { Authorization: authorization } } })
  const { data: identity } = await supabase.auth.getUser()
  if (!identity.user) return json({ error: "Please sign in first." }, 401)
  const { data: application } = await supabase.from("creator_applications").select("status").eq("user_id", identity.user.id).maybeSingle()
  if (application?.status !== "approved") return json({ error: "An approved creator account is required to go live." }, 403)
  let input: { title?: string; description?: string }
  try { input = await request.json() } catch { return json({ error: "Invalid live-stream request." }, 400) }
  const title = input.title?.trim(), description = input.description?.trim() || ""
  if (!title || title.length < 3 || title.length > 120 || description.length > 500) return json({ error: "Enter a title between 3 and 120 characters." }, 400)
  let provider = "cloudflare", uid = "", playbackUrl = "", thumbnailUrl: string | null = null, rtmpsUrl: string | null = null, streamKey: string | null = null, srtUrl: string | null = null
  if (livepeerToken) {
    const livepeer = await fetch("https://livepeer.studio/api/stream", { method: "POST", headers: { Authorization: `Bearer ${livepeerToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: title, record: true }) })
    const payload = await livepeer.json().catch(() => null)
    if (!livepeer.ok || !payload?.id || !payload?.streamKey || !payload?.playbackId) return json({ error: payload?.message || payload?.error || "Livepeer could not create a live stream." }, 502)
    provider = "livepeer"
    uid = payload.id
    playbackUrl = `https://livepeercdn.studio/hls/${payload.playbackId}/index.m3u8`
    rtmpsUrl = "rtmp://rtmp.livepeer.com/live"
    streamKey = payload.streamKey
  } else {
    const cloudflare = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs`, { method: "POST", headers: { Authorization: `Bearer ${cloudflareToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ meta: { creator: identity.user.id, title }, recording: { mode: "automatic" } }) })
    const payload = await cloudflare.json().catch(() => null)
    if (!cloudflare.ok || !payload?.success || !payload?.result?.uid) return json({ error: payload?.errors?.[0]?.message || "Cloudflare could not create a live input." }, 502)
    uid = payload.result.uid
    playbackUrl = `https://videodelivery.net/${uid}/manifest/video.m3u8`
    thumbnailUrl = `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`
    rtmpsUrl = payload.result.rtmps?.url || null
    streamKey = payload.result.rtmps?.streamKey || payload.result.rtmps?.key || null
    srtUrl = payload.result.srt?.url || null
  }
  const { data: stream, error } = await supabase.from("creator_live_streams").insert({ creator_id: identity.user.id, title, description, provider, stream_uid: uid, playback_url: playbackUrl, thumbnail_url: thumbnailUrl }).select("id,title,stream_uid,playback_url,provider").single()
  if (error) return json({ error: error.message }, 500)
  return json({ stream, provider, rtmps_url: rtmpsUrl, stream_key: streamKey, srt_url: srtUrl })
})
