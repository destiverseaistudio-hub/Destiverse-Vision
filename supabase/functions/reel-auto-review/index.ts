import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))
type GeminiFile = { name: string; uri?: string; mimeType?: string; state?: string }
type GeminiDecision = { decision: "approve" | "reject" | "review"; confidence: number; creator_note: string; reason: string }
const clean = (value: unknown, length: number) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, length) : ""

async function getFile(key: string, name: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}?key=${encodeURIComponent(key)}`)
  if (!response.ok) throw new Error(`Gemini file check failed (${response.status})`)
  return (await response.json()).file as GeminiFile
}
async function uploadFile(key: string, media: Blob, displayName: string): Promise<GeminiFile> {
  const start = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": String(media.size), "X-Goog-Upload-Header-Content-Type": media.type || "video/mp4", "Content-Type": "application/json" }, body: JSON.stringify({ file: { display_name: displayName } }) })
  const uploadUrl = start.headers.get("x-goog-upload-url")
  if (!start.ok || !uploadUrl) throw new Error(`Gemini media upload could not start (${start.status})`)
  const upload = await fetch(uploadUrl, { method: "POST", headers: { "Content-Length": String(media.size), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" }, body: media })
  if (!upload.ok) throw new Error(`Gemini media upload failed (${upload.status})`)
  return (await upload.json()).file as GeminiFile
}
async function waitForActiveFile(key: string, initial: GeminiFile) {
  let file = initial
  for (let attempt = 0; attempt < 12 && file.state === "PROCESSING"; attempt += 1) { await sleep(4000); file = await getFile(key, file.name) }
  return file
}
async function reviewMedia(key: string, model: string, file: GeminiFile, title: string, caption: string): Promise<GeminiDecision> {
  if (!file.uri) throw new Error("Gemini did not provide a usable media file")
  const prompt = `You are DestiVerse Vision's Reel safety reviewer. Inspect the supplied Reel media and metadata. Title: ${title}\nCaption: ${caption}\nApprove only clearly suitable general-entertainment media. Reject only a clear, high-confidence violation such as explicit sexual content, graphic violence, hateful content, dangerous illegal activity, or a scam. Choose review for uncertainty about safety, context, age suitability, or rights. Do not infer sensitive traits. Give a short respectful creator note; never explain how to evade moderation.`
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": key, "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }, { file_data: { mime_type: file.mimeType || "video/mp4", file_uri: file.uri } }] }], generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { decision: { type: "STRING", enum: ["approve", "reject", "review"] }, confidence: { type: "NUMBER" }, creator_note: { type: "STRING" }, reason: { type: "STRING" } }, required: ["decision", "confidence", "creator_note", "reason"] } } }) })
  if (!response.ok) throw new Error(`Gemini review failed (${response.status})`)
  const body = await response.json(), text = body.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => part.text)?.text
  if (!text) throw new Error("Gemini did not return a review")
  const parsed = JSON.parse(text), decision = ["approve", "reject", "review"].includes(parsed.decision) ? parsed.decision : "review"
  return { decision, confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)), creator_note: clean(parsed.creator_note, 600), reason: clean(parsed.reason, 600) } as GeminiDecision
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405)
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), key = Deno.env.get("GEMINI_API_KEY"), model = Deno.env.get("GEMINI_REEL_REVIEW_MODEL") || Deno.env.get("GEMINI_MODEL"), authorization = request.headers.get("Authorization")
  if (!url || !anon || !service || !authorization) return respond({ error: "Automated review is not configured" }, 503)
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } }), { data: auth } = await caller.auth.getUser()
  if (!auth.user) return respond({ error: "Authentication required" }, 401)
  const { reelId } = await request.json().catch(() => ({}))
  if (typeof reelId !== "string") return respond({ error: "A Reel id is required" }, 400)
  const { data: reel, error } = await caller.from("reel_submissions").select("id,title,caption,creator_id,status,video_url,ai_media_file_name").eq("id", reelId).maybeSingle()
  if (error || !reel || reel.creator_id !== auth.user.id || reel.status !== "pending") return respond({ error: "Reel not available for review" }, 404)
  const admin = createClient(url, service)
  // Cloudflare Stream playback URLs are HLS manifests, not the uploaded source
  // video Gemini's Files API needs. Keep these Reels in the human queue until
  // the media-processing worker supplies a reviewable source rendition.
  if (/^https?:\/\//i.test(reel.video_url)) {
    await admin.from("reel_submissions").update({ auto_review_status: "needs_review", auto_review_reason: "Cloudflare video is encoding; automatic media review will continue when the processing worker provides a source rendition." }).eq("id", reel.id)
    return respond({ status: "processing", notice: "Your Reel is encoding securely. It will continue to review when processing is ready." }, 202)
  }
  if (!key || !model) { await admin.from("reel_submissions").update({ auto_review_status: "unavailable", auto_review_reason: "AI media review is not configured yet." }).eq("id", reel.id); return respond({ status: "unavailable", notice: "Your Reel is queued for an administrator because AI review is not configured." }) }
  try {
    let file: GeminiFile
    if (reel.ai_media_file_name) file = await getFile(key, reel.ai_media_file_name)
    else {
      const { data: signed, error: signedError } = await admin.storage.from("creator-reels").createSignedUrl(reel.video_url, 600)
      if (signedError || !signed?.signedUrl) throw new Error("Could not securely access the submitted media")
      const mediaResponse = await fetch(signed.signedUrl); if (!mediaResponse.ok) throw new Error("Could not download the submitted media")
      const media = await mediaResponse.blob(); if (media.size > 50 * 1024 * 1024) throw new Error("Reels larger than 50 MB require administrator review")
      file = await uploadFile(key, media, `destiverse-reel-${reel.id}`)
      await admin.from("reel_submissions").update({ auto_review_status: "processing", auto_review_reason: "Gemini is processing the uploaded media.", ai_media_file_name: file.name }).eq("id", reel.id)
    }
    file = await waitForActiveFile(key, file)
    if (file.state === "PROCESSING") return respond({ status: "processing", notice: "Gemini is still processing this media. Re-open Creator Studio to check its progress." }, 202)
    if (file.state === "FAILED") throw new Error("Gemini could not process this media")
    const result = await reviewMedia(key, model, file, reel.title, reel.caption), approved = result.decision === "approve" && result.confidence >= 0.9, rejected = result.decision === "reject" && result.confidence >= 0.95, status = approved ? "approved" : rejected ? "rejected" : "pending", reviewStatus = approved ? "clear" : rejected ? "flagged" : "needs_review", note = result.creator_note || (approved ? "Thanks for contributing to DestiVerse Vision." : "Your Reel needs a human review before it can be published.")
    const { error: saveError } = await admin.from("reel_submissions").update({ status, published_at: approved ? new Date().toISOString() : null, moderation_note: note, auto_review_status: reviewStatus, auto_review_reason: result.reason, auto_reviewed_at: new Date().toISOString(), ai_decision: result.decision, ai_confidence: result.confidence, ai_creator_note: note, ai_reviewed_at: new Date().toISOString(), ai_media_file_name: null }).eq("id", reel.id)
    if (saveError) throw saveError
    void fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${encodeURIComponent(key)}`, { method: "DELETE" })
    return respond({ status, review_status: reviewStatus, note, notice: approved ? "Your Reel passed AI review and is live." : rejected ? "Your Reel needs changes. See the review note in Creator Studio." : "Your Reel needs a human review before publication." })
  } catch (reviewError) { const reason = reviewError instanceof Error ? reviewError.message : "AI media review could not finish"; await admin.from("reel_submissions").update({ auto_review_status: "failed", auto_review_reason: reason }).eq("id", reel.id); return respond({ status: "failed", notice: "AI review could not finish, so the Reel is waiting for an administrator.", reason }) }
})
