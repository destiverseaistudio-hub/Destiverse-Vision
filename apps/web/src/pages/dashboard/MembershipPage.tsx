import { Bot, Check, Coins, Crown, ReceiptText, Send, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { purchaseAdFreeDay } from "@/services/ads"

type Plan = { id: string; name: string; price_cents: number | null; currency: string | null; features: string[]; coins_included: number }
type Subscription = { status: "inactive" | "active" | "past_due" | "cancelled"; expires_at: string | null; cancel_at_period_end: boolean }
type CoinProduct = { id: string; name: string; coins: number; price_cents: number; currency: string }
type Order = { id: string; reference: string; purpose: "membership" | "coins"; amount_cents: number; currency: string; status: string; paid_at: string | null; created_at: string }
type CoinEntry = { id: string; amount: number; reason: string; created_at: string }

const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount / 100)

export default function MembershipPage() {
  const { session } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [coins, setCoins] = useState(0)
  const [coinProducts, setCoinProducts] = useState<CoinProduct[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [coinEntries, setCoinEntries] = useState<CoinEntry[]>([])
  const [adFreeUntil, setAdFreeUntil] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [aiQuestion, setAiQuestion] = useState("")
  const [aiReply, setAiReply] = useState("")
  const [aiBusy, setAiBusy] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const refresh = () => setRefreshCount((c) => c + 1)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    const fetchMembershipData = async () => {
      const [planResult, subscriptionResult, walletResult, productResult, orderResult, ledgerResult, adPassResult] = await Promise.all([
        supabase.from("dv_subscription_plans").select("id,name,price_cents,currency,features,coins_included").eq("active", true),
        supabase.from("dv_subscriptions").select("status,expires_at,cancel_at_period_end").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("user_coin_wallets").select("balance").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("dv_coin_products").select("id,name,coins,price_cents,currency").eq("active", true),
        supabase.from("payment_orders").select("id,reference,purpose,amount_cents,currency,status,paid_at,created_at").order("created_at", { ascending: false }).limit(12),
        supabase.from("coin_ledger").select("id,amount,reason,created_at").order("created_at", { ascending: false }).limit(12),
        supabase.from("user_ad_free_passes").select("expires_at").eq("user_id", session.user.id).maybeSingle(),
      ])
      if (!active) return
      setPlans((planResult.data ?? []) as Plan[])
      setSubscription(subscriptionResult.data as Subscription | null)
      setCoins(walletResult.data?.balance ?? 0)
      setCoinProducts((productResult.data ?? []) as CoinProduct[])
      setOrders((orderResult.data ?? []) as Order[])
      setCoinEntries((ledgerResult.data ?? []) as CoinEntry[])
      setAdFreeUntil(adPassResult.data?.expires_at ?? null)
    }
    void fetchMembershipData()
    return () => { active = false }
  }, [session?.user?.id, refreshCount])

  const premiumActive = subscription?.status === "active" && (!subscription.expires_at || new Date(subscription.expires_at) > new Date())
  const beginCheckout = async (purpose: "membership" | "coins", id: string) => {
    setNotice(""); setBusy(true)
    const { data, error } = await supabase.functions.invoke("initialize-paystack-payment", { body: { purpose, id } })
    if (error || !data?.authorization_url) { setNotice(data?.error || "Secure checkout could not be opened."); setBusy(false); return }
    window.location.assign(data.authorization_url)
  }
  const cancelAtEnd = async () => {
    setBusy(true); setNotice("")
    const { error } = await supabase.rpc("cancel_own_membership_at_period_end")
    if (error) setNotice(error.message); else { setNotice("Premium will remain active until its current expiry date and will not renew automatically."); refresh() }
    setBusy(false)
  }
  const buyAdFreeDay = async () => {
    setBusy(true); setNotice("")
    try { const expires = await purchaseAdFreeDay(); setAdFreeUntil(expires); setCoins((current) => current - 30); setNotice("30 Coins used. Your DestiVerse experience is ad-free for 24 hours.") }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not activate your ad-free day.") }
    setBusy(false)
  }
  const askMembershipGuide = async () => {
    if (!aiQuestion.trim()) return
    setAiBusy(true); setAiReply("")
    const context = `Membership page context: Premium is ${premiumActive ? "active" : "not active"}; Coin balance is ${coins}. Give clear, optional, non-sales guidance only. Never claim you can buy a plan or change an account. Question: ${aiQuestion.trim()}`
    const { data, error } = await supabase.functions.invoke("viewer-ai-assistant", { body: { message: context } })
    setAiReply(error || !data?.reply ? data?.error || "The membership helper is temporarily unavailable." : data.reply)
    setAiBusy(false)
  }
  return <main className="mx-auto max-w-5xl space-y-6 pb-10">
    <section className="overflow-hidden rounded-3xl border border-[var(--dv-accent)]/30 bg-gradient-to-br from-[var(--dv-accent)]/20 via-[var(--dv-surface)] to-[#111827] p-6 sm:p-9"><div className="flex flex-wrap items-start justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--dv-accent)]">Optional upgrades</p><h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Enjoy more. Keep watching free.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Premium and Coins are optional extras. All core viewing, Reels, profiles, comments, watchlists, and Offline Watch remain free.</p></div><Crown className="size-12 text-[var(--dv-accent)]" /></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><span className="text-xs text-slate-400">Membership</span><strong className="mt-1 block text-lg text-white">{premiumActive ? "Premium active" : "Free experience"}</strong>{premiumActive && subscription?.expires_at ? <p className="mt-1 text-xs text-slate-300">Access ends {new Date(subscription.expires_at).toLocaleDateString()}{subscription.cancel_at_period_end ? " · renewal cancelled" : ""}</p> : null}{premiumActive && !subscription?.cancel_at_period_end ? <button type="button" onClick={() => void cancelAtEnd()} disabled={busy} className="mt-3 text-xs font-bold text-slate-300 underline">Cancel at end of access</button> : null}</div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><span className="text-xs text-slate-400">Coin balance</span><strong className="mt-1 flex items-center gap-2 text-lg text-white"><Coins className="size-5 text-amber-300" /> {coins} Coins</strong></div></div></section>
    <section><div className="flex items-center gap-2"><Sparkles className="size-5 text-[var(--dv-accent)]" /><h2 className="text-2xl font-black text-white">Premium plans</h2></div><div className="mt-4 grid gap-4 md:grid-cols-2">{plans.map((plan) => <article key={plan.id} className="rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-6"><h3 className="text-xl font-black text-white">{plan.name}</h3><p className="mt-2 text-lg font-bold text-[var(--dv-accent)]">{plan.price_cents && plan.currency ? money(plan.price_cents, plan.currency) : "Price set at checkout"}</p><ul className="mt-5 space-y-2 text-sm text-slate-300">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />{feature}</li>)}</ul><button type="button" disabled={busy} onClick={() => void beginCheckout("membership", plan.id)} className="mt-6 rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Continue to secure checkout</button></article>)}</div>{!plans.length ? <p className="mt-4 text-sm text-slate-400">No optional plans are available right now.</p> : null}</section>
    <section className="rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-6"><div className="flex items-center gap-3"><Coins className="size-6 text-amber-300" /><div><h2 className="text-xl font-black text-white">Coins</h2><p className="mt-1 text-sm text-slate-400">Optional virtual credits for future extras. They never replace free access.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{coinProducts.map((product) => <article key={product.id} className="flex items-center justify-between rounded-2xl border border-white/10 p-4"><div><strong className="block text-white">{product.name}</strong><span className="text-sm text-slate-400">{product.coins} Coins · {money(product.price_cents, product.currency)}</span></div><button type="button" disabled={busy} onClick={() => void beginCheckout("coins", product.id)} className="rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Buy</button></article>)}</div>{!coinProducts.length ? <p className="mt-4 text-sm text-slate-400">No Coin packs are available right now.</p> : null}</section>
    <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-5"><div className="flex items-center gap-2"><ReceiptText className="size-5 text-[var(--dv-accent)]" /><h2 className="text-xl font-black text-white">Payment history</h2></div><div className="mt-4 space-y-3">{orders.length ? orders.map((order) => <article key={order.id} className="rounded-xl border border-white/10 bg-black/15 p-3"><div className="flex justify-between gap-3"><strong className="text-sm text-white">{order.purpose === "coins" ? "Coin purchase" : "Premium access"}</strong><span className={order.status === "paid" ? "text-xs font-bold text-emerald-300" : "text-xs font-bold text-amber-300"}>{order.status}</span></div><p className="mt-1 text-xs text-slate-400">{money(order.amount_cents, order.currency)} · {new Date(order.created_at).toLocaleString()}</p><p className="mt-1 break-all text-[10px] text-slate-500">Receipt: {order.reference}</p></article>) : <p className="text-sm text-slate-400">Your completed payments will appear here.</p>}</div></div><div className="rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-5"><div className="flex items-center gap-2"><Coins className="size-5 text-amber-300" /><h2 className="text-xl font-black text-white">Coin history</h2></div><div className="mt-4 space-y-3">{coinEntries.length ? coinEntries.map((entry) => <article key={entry.id} className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/15 p-3"><div><strong className="block text-sm text-white">{entry.reason}</strong><span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString()}</span></div><strong className={entry.amount > 0 ? "text-emerald-300" : "text-red-300"}>{entry.amount > 0 ? "+" : ""}{entry.amount}</strong></article>) : <p className="text-sm text-slate-400">Your Coin activity will appear here.</p>}</div></div></section>
    <section className="rounded-3xl border border-[var(--dv-accent)]/30 bg-[var(--dv-accent)]/10 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">Coin choice</p><h2 className="mt-1 text-xl font-black text-white">One-day ad-free pass · 30 Coins</h2><p className="mt-1 text-sm text-slate-300">Keep your free account and pause DestiVerse ads for 24 hours.</p>{adFreeUntil && new Date(adFreeUntil) > new Date() ? <p className="mt-2 text-xs font-bold text-emerald-300">Active until {new Date(adFreeUntil).toLocaleString()}</p> : null}</div><button type="button" disabled={busy || premiumActive || Boolean(adFreeUntil && new Date(adFreeUntil) > new Date())} onClick={() => void buyAdFreeDay()} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-black disabled:opacity-50">{premiumActive ? "Premium is ad-free" : "Use 30 Coins"}</button></div></section>
    <section className="rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-5"><div className="flex items-center gap-2"><Bot className="size-5 text-[var(--dv-accent)]" /><div><h2 className="text-xl font-black text-white">Membership guide</h2><p className="mt-1 text-sm text-slate-400">Ask about Premium, Coins, or Creator Pro. It gives guidance only; you always choose whether to buy.</p></div></div><div className="mt-4 flex gap-2"><input value={aiQuestion} maxLength={500} onChange={(event) => setAiQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void askMembershipGuide() } }} placeholder="Which option suits offline viewing?" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-sm text-white" /><button type="button" onClick={() => void askMembershipGuide()} disabled={aiBusy || !aiQuestion.trim()} className="grid size-11 place-items-center rounded-xl bg-[var(--dv-accent)] text-white disabled:opacity-50" aria-label="Ask membership guide"><Send className="size-4" /></button></div>{aiBusy ? <p className="mt-3 text-sm text-slate-400">Thinking…</p> : null}{aiReply ? <p className="mt-3 rounded-xl bg-black/20 p-3 text-sm leading-6 text-slate-200">{aiReply}</p> : null}</section>
    {notice ? <p role="status" className="text-sm text-slate-300">{notice}</p> : null}
  </main>
}
