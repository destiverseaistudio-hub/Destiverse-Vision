import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), authorization = request.headers.get("Authorization")
  if (!url || !anon || !authorization) return json({ error: "Location search is not configured." }, 503)
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
  const { data: identity } = await caller.auth.getUser()
  if (!identity.user) return json({ error: "Sign in to search locations." }, 401)
  let input: { query?: string }
  try { input = await request.json() } catch { return json({ error: "Invalid location search." }, 400) }
  const query = input.query?.trim().replace(/\s+/g, " ")
  if (!query || query.length < 2 || query.length > 100) return json({ error: "Enter a location between 2 and 100 characters." }, 400)
  const upstream = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`)
  if (!upstream.ok) return json({ error: "Location search is temporarily unavailable." }, 502)
  const payload = await upstream.json()
  const results = Array.isArray(payload.results) ? payload.results.map((item: Record<string, unknown>) => {
    const name = String(item.name ?? "")
    const parts = [item.admin1, item.country].filter((part) => typeof part === "string" && part && part !== name)
    return { id: Number(item.id), name, label: [name, ...parts].join(", "), latitude: Number(item.latitude), longitude: Number(item.longitude) }
  }).filter((item: { id: number; name: string; latitude: number; longitude: number }) => item.name && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) : []
  return json({ results, attribution: "Location data by Open-Meteo / GeoNames" })
})
