import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), account = Deno.env.get("CLOUDFLARE_ACCOUNT_ID"), token = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN"), authorization = request.headers.get("Authorization")
  if (!url || !anon || !service || !account || !token || !authorization) return json({ error: "Live streaming is not configured." }, 503)
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
  const { data: identity } = await caller.auth.getUser()
  if (!identity.user) return json({ error: "Authentication required" }, 401)
  const admin = createClient(url, service)
  const { data: streams } = await admin.from("creator_live_streams").select("id,stream_uid,status").in("status", ["scheduled", "live"])
  const updates = await Promise.all((streams ?? []).map(async (stream) => {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/stream/live_inputs/${stream.stream_uid}`, { headers: { Authorization: `Bearer ${token}` } })
    const payload = await response.json().catch(() => null)
    const current = String(payload?.result?.status?.current || "").toLowerCase()
    const next = ["connected", "live", "active"].includes(current) ? "live" : "scheduled"
    if (next !== stream.status) await admin.from("creator_live_streams").update({ status: next, started_at: next === "live" ? new Date().toISOString() : null }).eq("id", stream.id)
    return next
  }))
  return json({ refreshed: updates.length, live: updates.filter((status) => status === "live").length })
})
