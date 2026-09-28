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
  let input: { description?: string }
  try { input = await request.json() } catch { return reply({ error: "Invalid request." }, 400) }
  const description = input.description?.trim()
  if (!description || description.length < 12 || description.length > 800) return reply({ error: "Describe your Reel in 12 to 800 characters." }, 400)
  const { data: usage, error: usageError } = await supabase.rpc("consume_creator_reel_ai_request")
  const allowance = Array.isArray(usage) ? usage[0] : usage
  if (usageError) return reply({ error: usageError.message }, 403)
  if (!allowance?.allowed) return reply({ error: "Your five free creator Reel drafts for this week have been used. Try again next week." }, 429)
  const prompt = `You draft concise Reel metadata for DestiVerse Vision. Return JSON only with title, caption, sound_label. Use only the creator's description below. Do not invent people, events, claims, or copyrighted songs. title: 3-90 characters. caption: 20-450 characters. sound_label: a generic, optional original-sound label under 80 characters.\n\nCreator description: ${description}`
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.35, maxOutputTokens: 500, responseMimeType: "application/json", responseSchema: { type: "OBJECT", required: ["title", "caption", "sound_label"], properties: { title: { type: "STRING" }, caption: { type: "STRING" }, sound_label: { type: "STRING" } } } } }) })
  if (!response.ok) return reply({ error: "Creator AI is temporarily unavailable. Your weekly draft was not restored; please try again later." }, 502)
  try {
    const result = await response.json(), parsed = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}")
    return reply({ title: typeof parsed.title === "string" ? parsed.title.trim().slice(0, 90) : "", caption: typeof parsed.caption === "string" ? parsed.caption.trim().slice(0, 450) : description, sound_label: typeof parsed.sound_label === "string" ? parsed.sound_label.trim().slice(0, 80) : "Original sound · DestiVerse", remaining: Number(allowance.remaining) })
  } catch { return reply({ error: "Creator AI returned an invalid draft." }, 502) }
})
