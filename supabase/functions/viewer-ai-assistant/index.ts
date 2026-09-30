import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const geminiKey = Deno.env.get("GEMINI_API_KEY")
  const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite"
  const authorization = request.headers.get("Authorization")
  if (!supabaseUrl || !anonKey || !geminiKey || !authorization) return reply({ error: "AI helper is not configured" }, 503)

  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return reply({ error: "Please sign in to use the AI helper" }, 401)

  let input: { message?: string; use_coins?: boolean }
  try { input = await request.json() } catch { return reply({ error: "Invalid request" }, 400) }
  const message = input.message?.trim()
  if (!message || message.length > 700) return reply({ error: "Ask a question between 1 and 700 characters." }, 400)

  const { data: isAdmin } = await supabase.rpc("is_admin")
  const prompt = `You are Vision Guide, DestiVerse Vision's in-app help assistant. DestiVerse Vision is a video-streaming, digital-storytelling, Reels, creator, and live-video platform. Be warm, concise, practical, and accurate. Answer only from the feature guide below and the user's question.

Feature guide:
- Browse: Home highlights, Categories, Search, films/series/documentaries/AI videos/podcasts/music/interviews, and Reels.
- Viewing: Play titles, use Watchlist and Library, and use Offline Watch. Offline files are stored on the user's device/browser; they may be removed by the user or browser. Optional Google Drive export requires the user's consent and may not be available for every account.
- Reels: View approved Reels, react, comment, share, save, report, follow creators, view creator profiles, and browse sounds. A saved Reel appears in the user's saved area.
- Creator tools: Approved creators can edit their creator profile, submit Reels for review, see private/published/saved content and activity, use the Reel metadata assistant, and create live-stream inputs when live access is configured. Reels are moderated before public visibility. Creator Pro is for eligible long-form Film Studio submissions; it is not required to watch the app.
- Account: Profile, notification preferences, push-notification permission, Settings, Help Center, and account-safety choices. Phone push delivery depends on browser/device permission and an active subscription.
- Optional purchases: Premium and Coins are optional. Core viewing must not be presented as requiring a subscription or Coins. Coins can optionally be used for extra AI replies only after the free allowance.
- Support and safety: Users can report Reels, creators, and comments. For problems, explain where to find Help Center or support; do not promise a resolution time.
- Live: Live rooms may be scheduled or live only when a creator and provider are configured. Do not promise a stream is available.

Boundaries:
- Never mention, describe, hint at, or list any internal administration panel, staff tools, system configuration, feature flags, ad controls, moderation dashboard, analytics, secrets, API keys, backend providers, or internal roles. These are not viewer-facing features.
- Do not reveal whether the signed-in user has any internal role or access. If asked about internal controls, simply say: "I can help with the viewer and creator features available in DestiVerse Vision."
- Do not claim you can see private account data, watch history, uploaded files, billing, device storage, notifications, Google Drive, or whether a setting/provider is currently enabled.
- Do not say you completed an action, sent a message, changed settings, granted access, checked a payment, or contacted support.
- Do not invent content, policies, subscription prices, Coin balances, technical fixes, legal commitments, or provider availability.
- For account security, legal, medical, financial, emergency, or abuse matters, recommend the appropriate professional service or DestiVerse Help Center.
- If a question depends on unknown account-specific information, explain the in-app path the user can use to check it.

User question: ${message}`
  // Gemini 2.5 access is restricted for some newer projects. Use the current
  // stable Flash-Lite family by default, while retaining a server-side override.
  let aiResponse: Response | undefined
  for (let attempt = 0; attempt < 3; attempt += 1) {
    aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 360, responseMimeType: "application/json", responseSchema: { type: "OBJECT", required: ["reply"], properties: { reply: { type: "STRING" } } } },
      }),
    })
    if (aiResponse.ok || ![429, 503].includes(aiResponse.status) || attempt === 2) break
    await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** attempt))
  }
  if (!aiResponse) return reply({ error: "The AI service could not start." }, 502)
  if (!aiResponse.ok) {
    const providerBody = await aiResponse.text()
    let providerMessage = "The AI service could not complete this request."
    try {
      const parsed = JSON.parse(providerBody)
      providerMessage = typeof parsed.error?.message === "string" ? parsed.error.message : providerMessage
    } catch { /* Keep the safe fallback message. */ }
    const hint = aiResponse.status === 401 || aiResponse.status === 403
      ? " The DestiVerse owner needs to check the Gemini API key and API access."
      : aiResponse.status === 429
        ? " The AI service is busy. Please try again shortly."
        : " Please try again shortly."
    return reply({ error: `Vision Guide is unavailable (${aiResponse.status}): ${providerMessage}${hint}` }, 502)
  }
  try {
    const result = await aiResponse.json()
    const parsed = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}")
    const text = typeof parsed.reply === "string" ? parsed.reply.trim().slice(0, 1400) : "I could not prepare a response. Please try again."
    // Record the free reply or deduct Coins only after a usable reply is ready.
    // A Gemini error must never cost the viewer Coins.
    if (isAdmin !== true) {
      const { data: allowed, error: quotaError } = await supabase.rpc("consume_viewer_ai_request", { p_use_coins: input.use_coins === true })
      if (quotaError) return reply({ error: "Could not check the AI helper limit." }, 500)
      if (allowed !== true) return reply({ error: "You have reached today’s 20 free AI replies. You can return tomorrow or explicitly use 2 Coins for one extra reply.", coin_cost: 2 }, 429)
    }
    return reply({ reply: text })
  } catch { return reply({ error: "The AI helper returned an invalid response." }, 502) }
})
