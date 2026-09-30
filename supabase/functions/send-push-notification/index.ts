import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const url = Deno.env.get("SUPABASE_URL"), anonKey = Deno.env.get("SUPABASE_ANON_KEY"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY"), privateKey = Deno.env.get("VAPID_PRIVATE_KEY"), subject = Deno.env.get("VAPID_SUBJECT")
  const authorization = request.headers.get("Authorization")
  if (!url || !anonKey || !serviceKey || !publicKey || !privateKey || !subject || !authorization) return json({ error: "Push delivery is not configured yet." }, 503)

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: identity } = await caller.auth.getUser()
  if (!identity.user) return json({ error: "Sign in as an administrator." }, 401)
  const { data: isAdmin } = await caller.rpc("is_admin")
  if (isAdmin !== true) return json({ error: "Only administrators can send push notifications." }, 403)

  let input: { title?: string; message?: string; action_url?: string | null; audience?: "all" | "admins" | "testers" }
  try { input = await request.json() } catch { return json({ error: "Invalid notification payload." }, 400) }
  const title = input.title?.trim().slice(0, 120), body = input.message?.trim().slice(0, 600)
  if (!title || !body) return json({ error: "A title and message are required." }, 400)

  webpush.setVapidDetails(subject, publicKey, privateKey)
  const admin = createClient(url, serviceKey)
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth,user_id")
    .eq("active", true)
  if (error) return json({ error: error.message }, 500)
  const userIds = [...new Set((subscriptions ?? []).map((item) => item.user_id))]
  const { data: preferences } = userIds.length
    ? await admin.from("user_preferences").select("user_id,notifications_enabled,push_app_updates").in("user_id", userIds)
    : { data: [] }
  const enabled = new Set((preferences ?? []).filter((item) => item.notifications_enabled !== false && item.push_app_updates !== false).map((item) => item.user_id))
  // There is no tester membership model yet. Keep both restricted audiences
  // inside the existing administrator boundary rather than leaking a private
  // announcement to every subscribed device.
  if (input.audience === "admins" || input.audience === "testers") {
    const { data: admins, error: adminsError } = await admin.from("user_roles").select("user_id").eq("role", "admin")
    if (adminsError) return json({ error: adminsError.message }, 500)
    const adminIds = new Set((admins ?? []).map((item) => item.user_id))
    for (const userId of enabled) if (!adminIds.has(userId)) enabled.delete(userId)
  }
  const payload = JSON.stringify({ title, body, url: input.action_url || "/dashboard/notifications" })
  let delivered = 0
  await Promise.all((subscriptions ?? []).filter((item) => enabled.has(item.user_id)).map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 60 * 60 * 24 })
      delivered += 1
    } catch (deliveryError) {
      const statusCode = deliveryError && typeof deliveryError === "object" && "statusCode" in deliveryError ? Number(deliveryError.statusCode) : 0
      if (statusCode === 404 || statusCode === 410) await admin.from("push_subscriptions").update({ active: false }).eq("endpoint", subscription.endpoint)
    }
  }))
  return json({ delivered })
})
