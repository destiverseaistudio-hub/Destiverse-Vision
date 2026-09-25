import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })

type ReviewResult = { status: "clear" | "needs_review" | "flagged"; reason: string }

function localTriage(title: string, caption: string): ReviewResult {
  const text = `${title} ${caption}`.toLowerCase()
  const highRisk = ["kill", "suicide", "weapon", "porn", "nude", "nudity", "sexual", "hate", "terror", "scam", "giveaway", "crypto profit"]
  const mediumRisk = ["prank", "fight", "blood", "medical", "drink", "drug", "gambling", "copyright"]
  if (highRisk.some((term) => text.includes(term))) return { status: "flagged", reason: "Text metadata contains terms that require priority human review." }
  if (mediumRisk.some((term) => text.includes(term))) return { status: "needs_review", reason: "Text metadata may need an age, safety, or rights review." }
  return { status: "clear", reason: "Text metadata has no automated risk signals. A human must still review the video itself." }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const authorization = request.headers.get("Authorization")
  if (!supabaseUrl || !anonKey || !serviceKey || !authorization) return respond({ error: "Automated review is not configured" }, 503)
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: auth } = await userClient.auth.getUser()
  if (!auth.user) return respond({ error: "Authentication required" }, 401)
  const { reelId } = await request.json().catch(() => ({}))
  if (typeof reelId !== "string") return respond({ error: "A Reel id is required" }, 400)
  const { data: reel, error } = await userClient.from("reel_submissions").select("id,title,caption,creator_id,status").eq("id", reelId).maybeSingle()
  if (error || !reel || reel.creator_id !== auth.user.id || reel.status !== "pending") return respond({ error: "Reel not available for review" }, 404)
  const result = localTriage(reel.title, reel.caption)
  const adminClient = createClient(supabaseUrl, serviceKey)
  const { error: saveError } = await adminClient.from("reel_submissions").update({ auto_review_status: result.status, auto_review_reason: result.reason, auto_reviewed_at: new Date().toISOString() }).eq("id", reel.id)
  if (saveError) return respond({ error: "Could not save automated review" }, 500)
  return respond({ ...result, notice: "Automated review checked only title and caption. It did not watch the video." })
})
