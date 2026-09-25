import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
})

type OutboxEmail = {
  id: string
  user_id: string
  template: string
  subject: string
  payload: { guidelines?: string }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[character] ?? character))
}

function emailHtml(item: OutboxEmail, appUrl: string) {
  const guidelines = item.payload?.guidelines?.trim()
  if (item.template === "creator_access") {
    return `<main style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#171717;line-height:1.6"><h1 style="color:#e50914">Creator access is active</h1><p>Welcome to DestiVerse Creator Mode. Your creator account is now ready to upload Reels.</p><p>${escapeHtml(guidelines || "Upload up to 10 Reels per day and share only safe, respectful content that you have the rights to use.")}</p><p><a href="${escapeHtml(`${appUrl}/dashboard/create-reel`)}" style="display:inline-block;background:#e50914;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Upload a Reel</a></p><p>&mdash; DestiVerse Vision</p></main>`
  }
  return `<main style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#171717;line-height:1.6"><h1>${escapeHtml(item.subject)}</h1><p>${escapeHtml(guidelines || "You have an account update in DestiVerse Vision.")}</p></main>`
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const resendKey = Deno.env.get("RESEND_API_KEY")
  const from = Deno.env.get("RESEND_FROM_EMAIL")
  const publicAppUrl = Deno.env.get("PUBLIC_APP_URL")
  const appUrl = publicAppUrl?.replace(/\/$/, "")
  const authorization = request.headers.get("Authorization")
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendKey || !from || !appUrl || !authorization) {
    return reply({ error: "Email delivery is not configured" }, 503)
  }

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: auth } = await userClient.auth.getUser()
  if (!auth.user) return reply({ error: "Authentication required" }, 401)
  const { data: isAdmin, error: adminError } = await userClient.rpc("is_admin")
  if (adminError || isAdmin !== true) return reply({ error: "Admin access required" }, 403)

  const body = await request.json().catch(() => ({}))
  const emailId = typeof body.emailId === "string" ? body.emailId : null
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 25)
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  let query = adminClient.from("email_outbox").select("id,user_id,template,subject,payload").eq("status", "pending").order("created_at", { ascending: true }).limit(limit)
  if (emailId) query = query.eq("id", emailId)
  const { data: queued, error: queueError } = await query
  if (queueError) return reply({ error: "Could not read the email queue" }, 500)

  let sent = 0
  let failed = 0
  for (const item of (queued ?? []) as OutboxEmail[]) {
    const { data: userResult, error: userError } = await adminClient.auth.admin.getUserById(item.user_id)
    const recipient = userResult.user?.email
    if (userError || !recipient) {
      await adminClient.from("email_outbox").update({ status: "failed", failed_at: new Date().toISOString(), last_error: "The account has no deliverable email address.", attempt_count: 1 }).eq("id", item.id)
      failed += 1
      continue
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [recipient], subject: item.subject, html: emailHtml(item, appUrl) }),
    })
    const resultText = await resendResponse.text()
    let result: { id?: string; message?: string } = {}
    try { result = JSON.parse(resultText) } catch { /* keep provider response as text */ }

    if (resendResponse.ok) {
      await adminClient.from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: result.id ?? null, last_error: null, attempt_count: 1 }).eq("id", item.id)
      sent += 1
    } else {
      await adminClient.from("email_outbox").update({ status: "failed", failed_at: new Date().toISOString(), last_error: (result.message || resultText || `Resend returned ${resendResponse.status}`).slice(0, 500), attempt_count: 1 }).eq("id", item.id)
      failed += 1
    }
  }
  return reply({ queued: queued?.length ?? 0, sent, failed })
})
