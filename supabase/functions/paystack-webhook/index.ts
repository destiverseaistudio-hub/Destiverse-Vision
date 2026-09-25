import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const bytesFromHex = (value: string) => Uint8Array.from(value.match(/.{1,2}/g) ?? [], (byte) => Number.parseInt(byte, 16))
async function validSignature(raw: string, signature: string | null, secret: string) {
  if (!signature) return false
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"])
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)))
  const supplied = bytesFromHex(signature)
  if (expected.length !== supplied.length) return false
  let difference = 0; for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ supplied[index]
  return difference === 0
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 })
  const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), secret = Deno.env.get("PAYSTACK_SECRET_KEY")
  if (!url || !service || !secret) return new Response("Not configured", { status: 503 })
  const raw = await request.text()
  if (!await validSignature(raw, request.headers.get("x-paystack-signature"), secret)) return new Response("Invalid signature", { status: 401 })
  let event: { event?: string; data?: { reference?: string } }
  try { event = JSON.parse(raw) } catch { return new Response("Invalid payload", { status: 400 }) }
  if (event.event !== "charge.success" || !event.data?.reference) return new Response("ok", { status: 200 })
  const admin = createClient(url, service)
  const { data: order } = await admin.from("payment_orders").select("*").eq("reference", event.data.reference).eq("status", "pending").maybeSingle()
  if (!order) return new Response("ok", { status: 200 })
  const verification = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(order.reference)}`, { headers: { Authorization: `Bearer ${secret}` } })
  const verified = await verification.json(); const payment = verified?.data
  if (!verification.ok || payment?.status !== "success" || Number(payment?.amount) !== order.amount_cents || String(payment?.currency || "").toUpperCase() !== order.currency.toUpperCase()) return new Response("Verification failed", { status: 400 })
  const { data: claimed } = await admin.from("payment_orders").update({ status: "paid", provider_transaction_id: String(payment.id), paid_at: payment.paid_at || new Date().toISOString() }).eq("id", order.id).eq("status", "pending").select("id").maybeSingle()
  if (!claimed) return new Response("ok", { status: 200 })
  if (order.purpose === "coins") {
    const { data: product } = await admin.from("dv_coin_products").select("coins,name").eq("id", order.coin_product_id).single()
    const { data: wallet } = await admin.from("user_coin_wallets").select("balance").eq("user_id", order.user_id).maybeSingle()
    if (product) { await admin.from("user_coin_wallets").upsert({ user_id: order.user_id, balance: (wallet?.balance ?? 0) + product.coins, updated_at: new Date().toISOString() }); await admin.from("coin_ledger").insert({ user_id: order.user_id, amount: product.coins, reason: `Paystack purchase: ${product.name}`, provider_reference: order.reference }); await admin.from("user_notifications").insert({ user_id: order.user_id, title: "Coins added", message: `${product.coins} Coins were added after your Paystack payment.`, action_url: "/dashboard/membership" }) }
  } else if (order.purpose === "creator_plan") {
    const { data: plan } = await admin.from("dv_creator_plans").select("id,name,duration_days").eq("id", order.creator_plan_id).single()
    const { data: current } = await admin.from("creator_plan_subscriptions").select("expires_at").eq("user_id", order.user_id).maybeSingle()
    if (plan) { const expires = current?.expires_at && new Date(current.expires_at) > new Date() ? new Date(current.expires_at) : new Date(); expires.setUTCDate(expires.getUTCDate() + plan.duration_days); await admin.from("creator_plan_subscriptions").upsert({ user_id: order.user_id, plan_id: plan.id, status: "active", expires_at: expires.toISOString(), updated_at: new Date().toISOString() }); await admin.from("user_notifications").insert({ user_id: order.user_id, title: "Creator Pro is active", message: `${plan.name} is active until ${expires.toLocaleDateString()}.`, action_url: "/dashboard/creator-film-studio" }) }
  } else {
    const { data: plan } = await admin.from("dv_subscription_plans").select("id,duration_days").eq("id", order.plan_id).single()
    const { data: current } = await admin.from("dv_subscriptions").select("expires_at").eq("user_id", order.user_id).maybeSingle()
    if (plan) { const expires = current?.expires_at && new Date(current.expires_at) > new Date() ? new Date(current.expires_at) : new Date(); expires.setUTCDate(expires.getUTCDate() + plan.duration_days); await admin.from("dv_subscriptions").upsert({ user_id: order.user_id, plan_id: plan.id, status: "active", expires_at: expires.toISOString(), updated_at: new Date().toISOString() }); await admin.from("user_notifications").insert({ user_id: order.user_id, title: "Premium is active", message: `Your Premium access is active until ${expires.toLocaleDateString()}.`, action_url: "/dashboard/membership" }) }
  }
  return new Response("ok", { status: 200 })
})
