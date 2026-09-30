import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405)
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY"), geminiKey = Deno.env.get("GEMINI_API_KEY"), model = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite", authorization = request.headers.get("Authorization")
  if (!url || !key || !geminiKey || !authorization) return reply({ error: "Creator AI is not configured." }, 503)
  const supabase = createClient(url, key, { global: { headers: { Authorization: authorization } } })
  const { data: identity, error: identityError } = await supabase.auth.getUser()
  if (identityError || !identity.user) return reply({ error: "Please sign in first." }, 401)
  let input: { title?: string; description?: string; file_name?: string }
  try { input = await request.json() } catch { return reply({ error: "Invalid request." }, 400) }
  const title = input.title?.trim() || ""
  const description = input.description?.trim() || ""
  const fileName = input.file_name?.trim() || ""
  const evidence = [title, description, fileName].filter(Boolean).join("\n")
  if (evidence.length < 3 || evidence.length > 1_000) return reply({ error: "Add a title, caption, or selected video filename so AI has context." }, 400)
  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("handle,display_name,bio")
    .eq("user_id", identity.user.id)
    .maybeSingle()
  const { data: usage, error: usageError } = await supabase.rpc("consume_creator_reel_ai_request")
  const allowance = Array.isArray(usage) ? usage[0] : usage
  if (usageError) return reply({ error: usageError.message }, 403)
  if (!allowance?.allowed) return reply({ error: "Your five free creator Reel drafts for this week have been used. Try again next week." }, 429)
  const prompt = `You are a careful personal Reel-writing assistant for one DestiVerse Vision creator. Return JSON only with title, caption, sound_label.

Write in this creator's own clear, natural voice. Use only the creator profile, current title, caption, and filename below. Treat the filename as a weak topic hint, never proof that you watched the video. Do not say that you watched, inspected, or analyzed the video. Do not invent people, events, locations, actions, claims, copyrighted songs, or video details.

Improve the creator's wording rather than replacing real details. Avoid generic marketing copy such as “Experience something amazing”, “Join us”, or “DestiVerse Vision” unless the creator specifically made it central to the Reel. When the title or caption is generic but the filename has meaningful words, make a simple truthful title from those words. Keep uncertainty general rather than fabricating a plot.

title: 3-90 characters; concise and personal, not a platform slogan.
caption: 20-450 characters; warm and creator-led, using first person only when the profile or creator wording supports it.
sound_label: an optional generic original-sound label under 80 characters; never name a copyrighted track.

Creator profile
Display name: ${creatorProfile?.display_name?.trim() || "not supplied"}
Handle: ${creatorProfile?.handle?.trim() || "not supplied"}
Bio: ${creatorProfile?.bio?.trim().slice(0, 300) || "not supplied"}

Current title: ${title || "not supplied"}
Current caption: ${description || "not supplied"}
Selected filename: ${fileName || "not supplied"}`
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.35, maxOutputTokens: 500, responseMimeType: "application/json", responseSchema: { type: "OBJECT", required: ["title", "caption", "sound_label"], properties: { title: { type: "STRING" }, caption: { type: "STRING" }, sound_label: { type: "STRING" } } } } }) })
  if (!response.ok) return reply({ error: "Creator AI is temporarily unavailable. Your weekly draft was not restored; please try again later." }, 502)
  try {
    const result = await response.json(), parsed = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}")
    return reply({ title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 90) : title || fileName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").slice(0, 90), caption: typeof parsed.caption === "string" && parsed.caption.trim() ? parsed.caption.trim().slice(0, 450) : description, sound_label: typeof parsed.sound_label === "string" ? parsed.sound_label.trim().slice(0, 80) : "Original sound · DestiVerse", remaining: Number(allowance.remaining) })
  } catch { return reply({ error: "Creator AI returned an invalid draft." }, 502) }
})
