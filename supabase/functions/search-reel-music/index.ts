import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

type JamendoTrack = { id?: string; name?: string; artist_name?: string; duration?: number; audio?: string; audiodownload?: string; license_ccurl?: string; image?: string }

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), authorization = request.headers.get("Authorization"), clientId = Deno.env.get("JAMENDO_CLIENT_ID")
  if (!url || !anon || !authorization) return json({ error: "Music search is not configured." }, 503)
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
  const { data: identity } = await caller.auth.getUser()
  if (!identity.user) return json({ error: "Sign in to search music." }, 401)
  let input: { query?: string }
  try { input = await request.json() } catch { return json({ error: "Invalid music search." }, 400) }
  const query = input.query?.trim().replace(/\s+/g, " ")
  if (query && (query.length < 2 || query.length > 100)) return json({ error: "Enter a music search between 2 and 100 characters." }, 400)
  if (!clientId) return json({ results: [], notice: "The DestiVerse music provider is not configured yet. You can still use music you own." })
  const endpoint = new URL("https://api.jamendo.com/v3.0/tracks/")
  endpoint.searchParams.set("client_id", clientId)
  endpoint.searchParams.set("format", "json")
  endpoint.searchParams.set("limit", query ? "25" : "6")
  if (query) endpoint.searchParams.set("search", query)
  else endpoint.searchParams.set("fuzzytags", "instrumental")
  endpoint.searchParams.set("order", query ? "relevance" : "popularity_total")
  const upstream = await fetch(endpoint)
  if (!upstream.ok) return json({ error: "Music search is temporarily unavailable." }, 502)
  const payload = await upstream.json()
  const results = (Array.isArray(payload.results) ? payload.results : [])
    .map((track: JamendoTrack) => {
      const license = String(track.license_ccurl ?? "")
      // Only expose Creative Commons tracks that permit commercial reuse and
      // adaptations. Never treat unknown, NC, or ND tracks as free Reel music.
      const usable = /creativecommons\.org\/licenses\//i.test(license) && !/licenses\/by-nc|licenses\/by-nd/i.test(license)
      if (!usable || !track.id || !track.name || !track.audio) return null
      return { id: String(track.id), title: String(track.name).slice(0, 120), artist: String(track.artist_name ?? "Independent artist").slice(0, 120), duration: Number(track.duration) || 0, preview_url: track.audio, artwork_url: track.image ?? null, license_url: license, license_name: license.includes("zero") ? "CC0" : "Creative Commons Attribution", attribution: `“${track.name}” by ${track.artist_name ?? "Independent artist"}, licensed under ${license.includes("zero") ? "CC0" : "CC BY"}.` }
    })
    .filter(Boolean)
  return json({ results, provider: "Jamendo", attribution: "Music search results provided by Jamendo. Attribution is retained with every selected track." })
})
