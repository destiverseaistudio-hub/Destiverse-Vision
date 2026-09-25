import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })
const reference = () => `dv_${crypto.randomUUID().replaceAll("-", "")}`

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), secret = Deno.env.get("PAYSTACK_SECRET_KEY"), appUrl = Deno.env.get("PUBLIC_APP_URL")
  const authorization = request.headers.get("Authorization")
  if (!url || !anon || !service || !secret || !appUrl || !authorization) return json({ error: "Payments are not configured" }, 503)
  if (!secret.startsWith("sk_")) return json({ error: "PAYSTACK_SECRET_KEY must be a Paystack Secret Key beginning with sk_test_ or sk_live_. Do not use a public pk_ key." }, 503)
  const client = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
  const { data: identity, error: identityError } = await client.auth.getUser()
  if (identityError || !identity.user?.email) return json({ error: "A signed-in account with an email is required" }, 401)
  let input: { purpose?: "membership" | "coins" | "creator_plan"; id?: string }
  try { input = await request.json() } catch { return json({ error: "Invalid payment request" }, 400) }
  if (!input.id || !input.purpose || !["membership", "coins", "creator_plan"].includes(input.purpose)) return json({ error: "Choose a valid product" }, 400)
  const admin = createClient(url, service)
  let amount: number, currency: string, details: Record<string, unknown>
  if (input.purpose === "membership") {
    const { data: plan } = await admin.from("dv_subscription_plans").select("id,name,price_cents,currency").eq("id", input.id).eq("active", true).maybeSingle()
    if (!plan?.price_cents || !plan.currency) return json({ error: "This membership plan is unavailable" }, 404)
    amount = plan.price_cents; currency = plan.currency; details = { plan_id: plan.id }
  } else if (input.purpose === "coins") {
    const { data: product } = await admin.from("dv_coin_products").select("id,name,coins,price_cents,currency").eq("id", input.id).eq("active", true).maybeSingle()
    if (!product) return json({ error: "This Coin pack is unavailable" }, 404)
    amount = product.price_cents; currency = product.currency; details = { coin_product_id: product.id }
  } else {
    const { data: plan } = await admin.from("dv_creator_plans").select("id,name,price_cents,currency").eq("id", input.id).eq("active", true).maybeSingle()
    if (!plan?.price_cents || !plan.currency) return json({ error: "This Creator Pro plan is unavailable" }, 404)
    amount = plan.price_cents; currency = plan.currency; details = { creator_plan_id: plan.id }
  }
  const ref = reference()
  const { data: order, error: orderError } = await admin.from("payment_orders").insert({ reference: ref, user_id: identity.user.id, purpose: input.purpose, amount_cents: amount, currency, ...details }).select("id").single()
  if (orderError || !order) return json({ error: "Could not create payment order" }, 500)
  const paystack = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: identity.user.email, amount: String(amount), currency, reference: ref, callback_url: `${appUrl.replace(/\/$/, "")}/dashboard/payment?reference=${ref}`, metadata: { payment_order_id: order.id, purpose: input.purpose } }) })
  const payload = await paystack.json()
  if (!paystack.ok || !payload.status || !payload.data?.authorization_url) { await admin.from("payment_orders").update({ status: "failed" }).eq("id", order.id); return json({ error: payload.message || "Could not start Paystack checkout" }, 502) }
  return json({ authorization_url: payload.data.authorization_url })
})
