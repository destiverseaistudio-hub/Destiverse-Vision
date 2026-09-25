import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type AssistRequest = {
  mode?: "content" | "release" | "notification" | "feature_flag" | "support_reply" | "site_setting" | "site_setting_ideas"
  title: string
  description?: string
  version?: string
  videoUrl?: string
  fileName?: string
  currentType?: string
  currentCategory?: string
}

const platformContext = `DestiVerse Vision is a video-streaming and digital storytelling app. Its viewers watch AI videos, short films, documentaries, podcasts, interviews, music videos, creator stories, and original productions. It is not a travel, tourism, booking, maps, flights, hotels, shopping, or itinerary app. Never suggest travel planning, destinations, routes, exploration, packing, reservations, maps, or tourism.`

function settingGuidance(field: string) {
  switch (field.toLowerCase()) {
    case "about page":
      return "Write 3 substantial paragraphs (roughly 250-400 words) about DestiVerse Vision as a streaming and digital-storytelling platform: its purpose, the kinds of stories viewers can discover, and its viewer-first experience. Do not write terms, privacy rules, subscriptions, travel, or unsupported business claims."
    case "help center content":
      return "Write a useful 3-5 paragraph help-center introduction (roughly 180-320 words) for viewers: getting started, playing content, account help, and how to contact support. Do not invent support hours, response times, or contact details."
    case "privacy policy":
      return "Write a structured, plain-language privacy-policy draft of roughly 350-550 words with headings. It must be clearly marked as a draft requiring legal review before publication. Do not claim particular data practices, cookies, payments, age limits, retention periods, jurisdictions, or compliance unless supplied by the administrator."
    case "terms of service":
      return "Write a structured, plain-language terms draft of roughly 350-550 words with headings. It must be clearly marked as a draft requiring legal review before publication. Do not state subscription, payment, licensing, account-security, jurisdiction, or enforcement terms unless supplied by the administrator."
    case "maintenance message":
      return "Write 2 concise, reassuring sentences (50-100 words) about temporary DestiVerse Vision maintenance, viewing availability, and returning soon. Do not promise a time or claim a specific technical fix unless supplied."
    case "contact cta label":
      return "Write one direct, friendly CTA label of 2-6 words for viewers who need DestiVerse Vision support."
    default:
      return "Write clear, accurate viewer-facing text specifically for DestiVerse Vision."
  }
}

function fallbackRelease(input: AssistRequest) {
  const version = input.version?.trim() ? ` ${input.version.trim()}` : ""
  return {
    title: input.title.trim(),
    message: input.description?.trim() || `A new DestiVerse Vision update${version} is ready with improvements for a smoother viewing experience.`,
    announcement: `New update${version}: ${input.title.trim()}`,
    source: "fallback",
  }
}

function normalizeRelease(input: AssistRequest, suggestion: Record<string, unknown>) {
  const fallback = fallbackRelease(input)
  return {
    title: typeof suggestion.title === "string" && suggestion.title.trim() ? suggestion.title.trim().slice(0, 100) : fallback.title,
    message: typeof suggestion.message === "string" && suggestion.message.trim() ? suggestion.message.trim().slice(0, 360) : fallback.message,
    announcement: typeof suggestion.announcement === "string" && suggestion.announcement.trim() ? suggestion.announcement.trim().slice(0, 180) : fallback.announcement,
  }
}

function normalizeNotification(input: AssistRequest, suggestion: Record<string, unknown>) {
  return {
    title: typeof suggestion.title === "string" && suggestion.title.trim() ? suggestion.title.trim().slice(0, 90) : input.title.trim().slice(0, 90),
    message: typeof suggestion.message === "string" && suggestion.message.trim() ? suggestion.message.trim().slice(0, 300) : input.description?.trim() || "A new update is available in DestiVerse Vision.",
  }
}

const allowedTypes = ["Movie", "Series", "Short Film", "Documentary", "AI Video", "Dancing AI Video", "Podcast", "CEO & Business", "AI UGC", "Interview", "Music Video", "Tutorial", "Live Stream"]
const allowedCategories = ["DestiVerse Reels", "Originals", "African Stories", "AI Films", "Documentaries", "AI Video", "Dancing AI Video", "Podcast", "CEO & Business", "AI UGC", "Creator Stories"]
const allowedBadges = ["Featured", "Trending", "New", "Original", "Coming Soon", ""]

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "destiverse-content"
}

function fallbackSuggestions(input: AssistRequest) {
  const context = `${input.title} ${input.fileName || ""} ${input.videoUrl || ""}`.toLowerCase()
  const type = context.includes("podcast") ? "Podcast"
    : context.includes("dance") || context.includes("dancing") ? "Dancing AI Video"
      : context.includes("ugc") ? "AI UGC"
        : context.includes("ceo") || context.includes("business") ? "CEO & Business"
          : context.includes("documentary") ? "Documentary"
            : input.currentType || "AI Video"
  const category = type === "Podcast" ? "Podcast"
    : type === "Dancing AI Video" ? "Dancing AI Video"
      : type === "AI UGC" ? "AI UGC"
        : type === "CEO & Business" ? "CEO & Business"
          : type === "Documentary" ? "Documentaries"
            : "AI Video"
  return {
    id: slugify(input.title),
    description: `${input.title.trim()} is a DestiVerse Vision feature built for viewers who enjoy fresh digital storytelling and memorable visual experiences. The title brings its subject, mood, and creative direction into focus through an engaging video format. Explore the full presentation and discover a new perspective from the DestiVerse community.`,
    meta: type === "Podcast" ? "DestiVerse Podcast" : "AI Original",
    type,
    category,
    badge: "New",
    confidence: "low",
    warnings: ["Only the title and file context were available; verify the description and classification before publishing."],
    source: "fallback",
  }
}

function normalizeSuggestions(input: AssistRequest, suggestions: Record<string, unknown>) {
  const fallback = fallbackSuggestions(input)
  const suggestedType = typeof suggestions.type === "string" && allowedTypes.includes(suggestions.type) ? suggestions.type : fallback.type
  const suggestedCategory = typeof suggestions.category === "string" && allowedCategories.includes(suggestions.category) ? suggestions.category : fallback.category
  const suggestedBadge = typeof suggestions.badge === "string" && allowedBadges.includes(suggestions.badge) ? suggestions.badge : fallback.badge
  const context = `${input.title} ${input.fileName || ""} ${input.videoUrl || ""}`.toLowerCase()
  const type = context.includes("podcast") ? "Podcast"
    : context.includes("dance") || context.includes("dancing") ? "Dancing AI Video"
      : context.includes("ugc") || context.includes("user generated") ? "AI UGC"
        : context.includes("ceo") || context.includes("business") || context.includes("entrepreneur") ? "CEO & Business"
          : context.includes("interview") ? "Interview"
            : context.includes("music video") || context.includes("music") ? "Music Video"
              : context.includes("documentary") ? "Documentary"
                : context.includes("series") ? "Series"
                  : context.includes("movie") || context.includes("film") || context.includes("action") ? "Short Film"
                    : fallback.type
  const category = type === "Podcast" ? "Podcast"
    : type === "Dancing AI Video" ? "Dancing AI Video"
      : type === "AI UGC" ? "AI UGC"
        : type === "CEO & Business" ? "CEO & Business"
          : type === "Documentary" ? "Documentaries"
            : type === "Music Video" ? "AI Video"
              : context.includes("afric") ? "African Stories"
                : context.includes("original") ? "Originals"
                  : context.includes("ai") ? "AI Video"
                    : "DestiVerse Reels"
  return {
    id: typeof suggestions.id === "string" && suggestions.id.trim() ? slugify(suggestions.id) : slugify(input.title),
    description: typeof suggestions.description === "string" && suggestions.description.length >= 180
      ? suggestions.description
      : fallback.description,
    meta: typeof suggestions.meta === "string" && suggestions.meta.trim() ? suggestions.meta : fallback.meta,
    type: suggestedType,
    category: suggestedCategory,
    badge: allowedBadges.includes(typeof suggestions.badge === "string" ? suggestions.badge : "") ? (suggestions.badge as string) : suggestedBadge,
    confidence: typeof suggestions.confidence === "string" && ["high", "medium", "low"].includes(suggestions.confidence) ? suggestions.confidence : "medium",
    warnings: Array.isArray(suggestions.warnings) ? suggestions.warnings.filter((warning): warning is string => typeof warning === "string").slice(0, 4) : [],
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const geminiKey = Deno.env.get("GEMINI_API_KEY")
  const authorization = request.headers.get("Authorization")
  if (!supabaseUrl || !anonKey || !geminiKey || !authorization) {
    return response({ error: "AI assistant is not configured" }, 503)
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return response({ error: "Authentication required" }, 401)

  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin")
  if (roleError || isAdmin !== true) return response({ error: "Admin access required" }, 403)

  let input: AssistRequest
  try {
    input = await request.json()
  } catch {
    return response({ error: "Invalid request body" }, 400)
  }
  if (!input.title?.trim()) return response({ error: "A title is required" }, 400)

  const isReleaseRequest = input.mode === "release"
  const isNotificationRequest = input.mode === "notification"
  const isFlagRequest = input.mode === "feature_flag"
  const isSupportRequest = input.mode === "support_reply"
  const isSiteSettingRequest = input.mode === "site_setting"
  const isSiteSettingIdeasRequest = input.mode === "site_setting_ideas"
  const prompt = isSiteSettingIdeasRequest
    ? `You are the product communications strategist for DestiVerse Vision.
${platformContext}
Return JSON only with exactly this key: suggestions. Give exactly three distinct, safe, complete starting ideas for the requested site-setting field. Every idea must be specifically about DestiVerse Vision viewers, streaming content, viewer support, or app availability. Do not invent facts, legal commitments, dates, contact details, or links. Each suggestion must end with a complete sentence and be useful as rough notes an admin can expand.

Setting field: ${input.title}
Field requirements: ${settingGuidance(input.title)}`
    : isSiteSettingRequest
    ? `You are the product communications editor for DestiVerse Vision.
${platformContext}
Return JSON only with exactly this key: content. Turn the administrator's rough notes into clear, viewer-facing text for the requested site-setting field. Keep the text specific to the streaming app and its viewers. Do not invent facts, legal commitments, dates, claims, contact details, or links. Follow the field requirements for the appropriate detail and length.

Setting field: ${input.title}
Field requirements: ${settingGuidance(input.title)}
Administrator notes: ${input.description || "not supplied"}`
    : isFlagRequest
    ? `Return JSON only with key, name, description, audience. Convert the admin's feature idea into a safe feature flag. key: lowercase letters, numbers and underscores. audience exactly all, testers, or admins. Prefer testers for unproven features.\n\nFeature idea: ${input.description || input.title}`
    : isSupportRequest
    ? `Return JSON only with reply. Draft a clear, respectful support response using only the supplied ticket details. Do not promise a timeframe or claim a fix.\n\nTicket: ${input.description || input.title}`
    : isNotificationRequest
    ? `You are the viewer communications editor for DestiVerse Vision. Return JSON only with exactly these keys: title, message. Turn the administrator's notes into a clear, friendly in-app notification. Do not invent details, promises, dates, or links. title must be under 90 characters and message under 300 characters.\n\nAdmin notes: ${input.description || input.title}`
    : isReleaseRequest
    ? `You are the release communications editor for DestiVerse Vision, a streaming platform.
Return JSON only with exactly these keys: title, message, announcement.
Write clear, accurate app-update messaging from only the information supplied. Do not claim bug fixes, new capabilities, compatibility, performance results, or platform availability unless the admin explicitly supplied them. title must be concise. message must be one or two viewer-friendly sentences under 300 characters. announcement must be a concise one-line home-banner message under 150 characters.

Update title: ${input.title}
Version: ${input.version || "not supplied"}
Admin notes: ${input.description || "not supplied"}`
    : `You are the senior metadata editor for DestiVerse Vision, a streaming platform.
Return JSON only with exactly these keys: id, description, meta, type, category, badge, confidence, warnings.
id must be a lowercase URL-safe slug based on the title. description must be 3-4 polished sentences and at least 220 characters. meta must be a short truthful label. type must be exactly one of: ${allowedTypes.join(", ")}. category must be exactly one of: ${allowedCategories.join(", ")}. badge must be exactly one of: ${allowedBadges.map((badge) => badge || "empty string").join(", ")}. confidence must be high, medium, or low. warnings must be an array of short strings.
Accuracy rules: treat the title, supplied description, filename, and current selections as the only evidence. Do not invent people, locations, events, plot, claims, or production details. Prefer the supplied description when it contains real details. Match type/category only when evidence supports it; otherwise use the most conservative general option and set confidence to low with a warning asking the admin to verify it. Never imply that you watched or analyzed the video file. Keep the description useful but explicitly general when context is limited.

Title: ${input.title}
Existing description: ${input.description || "none provided"}
Video URL: ${input.videoUrl || "none provided"}
Filename: ${input.fileName || "none provided"}
Current type: ${input.currentType || "not selected"}
Current category: ${input.currentCategory || "not selected"}`

const responseSchema = isSiteSettingIdeasRequest
  ? { type: "OBJECT", required: ["suggestions"], properties: { suggestions: { type: "ARRAY", items: { type: "STRING" } } } }
  : isSiteSettingRequest
  ? { type: "OBJECT", required: ["content"], properties: { content: { type: "STRING" } } }
  : isFlagRequest
  ? { type: "OBJECT", required: ["key", "name", "description", "audience"], properties: { key: { type: "STRING" }, name: { type: "STRING" }, description: { type: "STRING" }, audience: { type: "STRING" } } }
  : isSupportRequest
  ? { type: "OBJECT", required: ["reply"], properties: { reply: { type: "STRING" } } }
  : isNotificationRequest
  ? { type: "OBJECT", required: ["title", "message"], properties: { title: { type: "STRING" }, message: { type: "STRING" } } }
  : isReleaseRequest
  ? {
      type: "OBJECT",
      required: ["title", "message", "announcement"],
      properties: {
        title: { type: "STRING" },
        message: { type: "STRING" },
        announcement: { type: "STRING" },
      },
    }
  : {
      type: "OBJECT",
      required: ["id", "description", "meta", "type", "category", "badge", "confidence", "warnings"],
      properties: {
        id: { type: "STRING" },
        description: { type: "STRING" },
        meta: { type: "STRING" },
        type: { type: "STRING" },
        category: { type: "STRING" },
        badge: { type: "STRING" },
        confidence: { type: "STRING" },
        warnings: { type: "ARRAY", items: { type: "STRING" } },
      },
    }

const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: `${platformContext}\n${isSiteSettingIdeasRequest ? "You are a careful product communications strategist. Return valid JSON only." : isSiteSettingRequest ? "You are a careful product communications editor. Return valid JSON only." : isNotificationRequest ? "You are a careful viewer communications editor. Return valid JSON only." : isReleaseRequest ? "You are a careful product-release editor. Return valid JSON only." : "You are a careful streaming-platform metadata editor. Return valid JSON only."}` }],
      },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema,
      },
    })
  })
  if (!aiResponse.ok) {
    const providerBody = await aiResponse.text()
    let providerMessage = "AI provider request failed"
    try {
      const parsed = JSON.parse(providerBody)
      providerMessage = parsed.error?.message || parsed.error?.status || providerMessage
    } catch {
      if (providerBody) providerMessage = providerBody.slice(0, 240)
    }
    if (aiResponse.status === 429 || aiResponse.status === 503) {
      return response(isReleaseRequest ? fallbackRelease(input) : isNotificationRequest ? normalizeNotification(input, {}) : isSiteSettingIdeasRequest ? { suggestions: [`Welcome viewers with a clear ${input.title.toLowerCase()} message.`, `Explain what viewers can expect and where to get help.`, `Keep the tone concise, friendly, and specific to DestiVerse Vision.`], source: "fallback" } : isSiteSettingRequest ? { content: input.description?.trim() || input.title.trim(), source: "fallback" } : fallbackSuggestions(input))
    }
    return response({ error: `Gemini ${aiResponse.status}: ${providerMessage}` }, 502)
  }

  const result = await aiResponse.json()
  try {
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text
    const parsed = JSON.parse(content ?? "{}")
    return response({
      ...(isSiteSettingIdeasRequest ? { suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((idea): idea is string => typeof idea === "string" && idea.trim()).map((idea) => idea.trim()).slice(0, 3) : [] } : isSiteSettingRequest ? { content: typeof parsed.content === "string" && parsed.content.trim() ? parsed.content.trim().slice(0, 5000) : input.description?.trim() || input.title.trim() } : isFlagRequest ? { key: slugify(typeof parsed.key === "string" ? parsed.key : input.title).replace(/-/g, "_"), name: typeof parsed.name === "string" ? parsed.name.slice(0, 100) : input.title, description: typeof parsed.description === "string" ? parsed.description.slice(0, 300) : input.description || "", audience: ["all", "testers", "admins"].includes(parsed.audience) ? parsed.audience : "testers" } : isSupportRequest ? { reply: typeof parsed.reply === "string" ? parsed.reply.slice(0, 600) : "Thank you for letting us know. Our team is reviewing your report." } : isNotificationRequest ? normalizeNotification(input, parsed) : isReleaseRequest ? normalizeRelease(input, parsed) : normalizeSuggestions(input, parsed)),
      source: "gemini",
    })
  } catch {
    return response({ error: "AI returned an invalid response" }, 502)
  }
})
