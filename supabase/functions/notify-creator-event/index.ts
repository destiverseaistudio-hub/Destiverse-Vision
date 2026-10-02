import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), publicKey = Deno.env.get("VAPID_PUBLIC_KEY"), privateKey = Deno.env.get("VAPID_PRIVATE_KEY"), subject = Deno.env.get("VAPID_SUBJECT"), authorization = request.headers.get("Authorization")
  if (!url || !anon || !service || !publicKey || !privateKey || !subject || !authorization) return json({ skipped: true })
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
  const { data: identity } = await caller.auth.getUser()
  if (!identity.user) return json({ error: "Authentication required" }, 401)
  let input: { type?: "like" | "follow" | "new_reel"; reel_id?: string; creator_id?: string }
  try { input = await request.json() } catch { return json({ error: "Invalid payload" }, 400) }
  const admin = createClient(url, service)
  if (input.type === "new_reel" && input.reel_id) {
    const { data: isAdmin } = await caller.rpc("is_admin")
    if (isAdmin !== true) return json({ error: "Only administrators can announce a newly approved Reel." }, 403)
    const { data: reel } = await admin.from("reel_submissions").select("id,creator_id,title,status").eq("id", input.reel_id).maybeSingle()
    if (!reel || reel.status !== "approved") return json({ skipped: true })
    const { data: reelCreator } = await admin.from("creator_profiles").select("display_name,handle").eq("user_id", reel.creator_id).maybeSingle()
    const { data: follows } = await admin.from("reel_creator_follows").select("follower_id").eq("creator_id", reel.creator_id)
    const recipientIds = [...new Set((follows ?? []).map((follow) => follow.follower_id).filter((userId) => userId !== reel.creator_id))]
    if (!recipientIds.length) return json({ delivered: 0 })
    const { data: preferences } = await admin.from("user_preferences").select("user_id,notifications_enabled,push_new_reels").in("user_id", recipientIds)
    const enabledIds = new Set((preferences ?? []).filter((preference) => preference.notifications_enabled !== false && preference.push_new_reels !== false).map((preference) => preference.user_id))
    if (!enabledIds.size) return json({ delivered: 0 })
    const { data: subscriptions } = await admin.from("push_subscriptions").select("endpoint,p256dh,auth,user_id").in("user_id", [...enabledIds]).eq("active", true)
    webpush.setVapidDetails(subject, publicKey, privateKey)
    const title = `New Reel from ${reelCreator?.display_name || reelCreator?.handle || "a creator you follow"}`
    const body = `${reel.title} is now available to watch.`
    let delivered = 0
    await Promise.all((subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title, body, url: "/dashboard/reels" }), { TTL: 60 * 60 * 12 })
        delivered += 1
      } catch (error) {
        const status = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 0
        if (status === 404 || status === 410) await admin.from("push_subscriptions").update({ active: false }).eq("endpoint", subscription.endpoint)
      }
    }))
    return json({ delivered })
  }
  let recipient = "", preference = "", title = "", body = "", actionUrl = "/dashboard/notifications"
  const [{ data: actorProfile }, { data: actorCreatorProfile }] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", identity.user.id).maybeSingle(),
    admin.from("creator_profiles").select("display_name,handle").eq("user_id", identity.user.id).maybeSingle(),
  ])
  const actorName = actorCreatorProfile?.display_name || actorProfile?.display_name || actorCreatorProfile?.handle || "A viewer"
  if (input.type === "like" && input.reel_id) {
    const [{ data: reaction }, { data: reel }] = await Promise.all([admin.from("reel_reactions").select("reel_id").eq("reel_id", input.reel_id).eq("user_id", identity.user.id).eq("reaction", "love").maybeSingle(), admin.from("reel_submissions").select("creator_id,title").eq("id", input.reel_id).maybeSingle()])
    if (!reaction || !reel || reel.creator_id === identity.user.id) return json({ skipped: true })
    recipient = reel.creator_id; preference = "push_reel_likes"; title = "New Reel like"; body = `Someone liked your Reel “${reel.title}”.`; actionUrl = `/dashboard/creator/${recipient}`
    body = `${actorName} liked your Reel.`
  } else if (input.type === "follow" && input.creator_id) {
    const { data: follow } = await admin.from("reel_creator_follows").select("creator_id").eq("creator_id", input.creator_id).eq("follower_id", identity.user.id).maybeSingle()
    if (!follow || input.creator_id === identity.user.id) return json({ skipped: true })
    recipient = input.creator_id; preference = "push_new_followers"; title = "New follower"; body = `${actorName} started following your creator profile.`; actionUrl = `/dashboard/creator/${recipient}`
  } else return json({ error: "Unsupported event" }, 400)
  const { data: prefs } = await admin.from("user_preferences").select(`notifications_enabled,${preference}`).eq("user_id", recipient).maybeSingle()
  if (prefs?.notifications_enabled === false || prefs?.[preference] === false) return json({ skipped: true })
  const { data: subscriptions } = await admin.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", recipient).eq("active", true)
  webpush.setVapidDetails(subject, publicKey, privateKey)
  let delivered = 0
  await Promise.all((subscriptions ?? []).map(async (subscription) => { try { await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title, body, url: actionUrl }), { TTL: 60 * 60 * 12 }); delivered += 1 } catch (error) { const status = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 0; if (status === 404 || status === 410) await admin.from("push_subscriptions").update({ active: false }).eq("endpoint", subscription.endpoint) } }))
  return json({ delivered })
})
