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
  const prompt = `You are Vision Guide, the helpful in-app assistant for DestiVerse Vision, a video-streaming and creator platform. Help with finding videos/Reels, using watchlists and Offline Watch, profiles, creator tools, comments, reporting, and account navigation. Be concise, friendly, and accurate. Do not claim you can see the user’s private account, perform actions, change subscriptions, access Google Drive, or contact support. Do not invent content, policy, payment, or technical facts. For account-security, legal, medical, financial, or emergency questions, direct the user to the appropriate professional or DestiVerse Help Center. Core DestiVerse features are free; subscriptions and coins are optional and must not be presented as required for viewing.\n\nViewer question: ${message}`
  // Use a stable production model. Preview model names can be retired without
  // notice, which previously made the membership helper appear unavailable.
  const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 360, responseMimeType: "application/json", responseSchema: { type: "OBJECT", required: ["reply"], properties: { reply: { type: "STRING" } } } },
    }),
  })
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
