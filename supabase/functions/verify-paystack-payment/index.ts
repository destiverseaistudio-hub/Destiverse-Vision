import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

async function fulfill(admin: ReturnType<typeof createClient>, secret: string, reference: string, userId?: string) {
  const { data: order } = await admin.from("payment_orders").select("*").eq("reference", reference).maybeSingle()
  if (!order || (userId && order.user_id !== userId)) return { error: "Payment order was not found", status: 404 }
  if (order.status === "paid") return { paid: true, message: "Payment was already confirmed." }
  const verification = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` } })
  const result = await verification.json()
  const payment = result?.data
  if (!verification.ok || payment?.status !== "success" || payment?.reference !== reference || Number(payment?.amount) !== order.amount_cents || String(payment?.currency || "").toUpperCase() !== order.currency.toUpperCase()) {
    return { paid: false, message: "Payment is not yet confirmed by Paystack." }
  }
  const { data: claimed, error: claimError } = await admin.from("payment_orders").update({ status: "paid", provider_transaction_id: String(payment.id), paid_at: payment.paid_at || new Date().toISOString() }).eq("id", order.id).eq("status", "pending").select("id").maybeSingle()
  if (claimError) return { error: "Could not update payment order", status: 500 }
  if (!claimed) return { paid: true, message: "Payment was already confirmed." }
  if (order.purpose === "coins") {
    const { data: product } = await admin.from("dv_coin_products").select("coins,name").eq("id", order.coin_product_id).maybeSingle()
    if (!product) return { error: "Coin product was unavailable during fulfillment", status: 500 }
    const { data: wallet } = await admin.from("user_coin_wallets").select("balance").eq("user_id", order.user_id).maybeSingle()
    const next = (wallet?.balance ?? 0) + product.coins
    await admin.from("user_coin_wallets").upsert({ user_id: order.user_id, balance: next, updated_at: new Date().toISOString() })
    await admin.from("coin_ledger").insert({ user_id: order.user_id, amount: product.coins, reason: `Paystack purchase: ${product.name}`, provider_reference: reference })
    await admin.from("user_notifications").insert({ user_id: order.user_id, title: "Coins added", message: `${product.coins} Coins were added after your Paystack payment.`, action_url: "/dashboard/membership" })
    return { paid: true, message: `${product.coins} Coins have been added to your balance.` }
  }
  if (order.purpose === "creator_plan") {
    const { data: plan } = await admin.from("dv_creator_plans").select("id,name,duration_days").eq("id", order.creator_plan_id).maybeSingle()
    if (!plan) return { error: "Creator Pro plan was unavailable during fulfillment", status: 500 }
    const { data: current } = await admin.from("creator_plan_subscriptions").select("expires_at").eq("user_id", order.user_id).maybeSingle()
    const base = current?.expires_at && new Date(current.expires_at) > new Date() ? new Date(current.expires_at) : new Date()
    base.setUTCDate(base.getUTCDate() + plan.duration_days)
    await admin.from("creator_plan_subscriptions").upsert({ user_id: order.user_id, plan_id: plan.id, status: "active", expires_at: base.toISOString(), updated_at: new Date().toISOString() })
    await admin.from("user_notifications").insert({ user_id: order.user_id, title: "Creator Pro is active", message: `${plan.name} is active until ${base.toLocaleDateString()}.`, action_url: "/dashboard/creator-film-studio" })
    return { paid: true, message: `${plan.name} is active until ${base.toLocaleDateString()}.` }
  }
  const { data: plan } = await admin.from("dv_subscription_plans").select("id,name,duration_days").eq("id", order.plan_id).maybeSingle()
  if (!plan) return { error: "Membership plan was unavailable during fulfillment", status: 500 }
  const { data: current } = await admin.from("dv_subscriptions").select("expires_at").eq("user_id", order.user_id).maybeSingle()
  const base = current?.expires_at && new Date(current.expires_at) > new Date() ? new Date(current.expires_at) : new Date()
  base.setUTCDate(base.getUTCDate() + plan.duration_days)
  await admin.from("dv_subscriptions").upsert({ user_id: order.user_id, plan_id: plan.id, status: "active", expires_at: base.toISOString(), updated_at: new Date().toISOString() })
  await admin.from("user_notifications").insert({ user_id: order.user_id, title: "Premium is active", message: `${plan.name} is active until ${base.toLocaleDateString()}.`, action_url: "/dashboard/membership" })
  return { paid: true, message: `${plan.name} is active until ${base.toLocaleDateString()}.` }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), secret = Deno.env.get("PAYSTACK_SECRET_KEY"), authorization = request.headers.get("Authorization")
  if (!url || !anon || !service || !secret || !authorization) return json({ error: "Payments are not configured" }, 503)
  if (!secret.startsWith("sk_")) return json({ error: "Payments are configured with an invalid Paystack Secret Key" }, 503)
  const client = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
  const { data: identity } = await client.auth.getUser()
  if (!identity.user) return json({ error: "Please sign in to verify a payment" }, 401)
  let input: { reference?: string }
  try { input = await request.json() } catch { return json({ error: "Invalid verification request" }, 400) }
  if (!input.reference || !/^[A-Za-z0-9_.=-]+$/.test(input.reference)) return json({ error: "Invalid payment reference" }, 400)
  const result = await fulfill(createClient(url, service), secret, input.reference, identity.user.id)
  return json(result, result.status || 200)
})
