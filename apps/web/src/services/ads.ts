import { supabase } from "@/lib/supabase"

export type AdFormat = "banner" | "ribbon" | "popup" | "pre_roll" | "mid_roll" | "end_card" | "reel_ad"
export type AdPlacement = "home" | "content" | "reels"

export type AdCampaign = {
  id: string
  name: string
  format: AdFormat
  placement: AdPlacement
  headline: string
  body: string
  media_url: string | null
  video_url: string | null
  cta_label: string
  cta_url: string | null
  skip_after_seconds: number
  midroll_at_seconds: number
  frequency_cap_per_day: number
  priority: number
  premium_visible: boolean
  reel_interval: number
}

const storageKey = "dv-ad-impressions"

function readImpressions() {
  try { return JSON.parse(localStorage.getItem(storageKey) || "{}") as Record<string, number> } catch { return {} }
}

function dailyKey(id: string) {
  return `${new Date().toISOString().slice(0, 10)}:${id}`
}

export function canShowAd(ad: AdCampaign) {
  return (readImpressions()[dailyKey(ad.id)] || 0) < ad.frequency_cap_per_day
}

export function rememberAdImpression(ad: AdCampaign) {
  const entries = readImpressions()
  const key = dailyKey(ad.id)
  entries[key] = (entries[key] || 0) + 1
  try { localStorage.setItem(storageKey, JSON.stringify(entries)) } catch { /* Storage can be unavailable in private mode. */ }
}

export async function getAdCampaigns(placement: AdPlacement, format: AdFormat, adFree: boolean) {
  if (adFree) return []
  const { data } = await supabase
    .from("ad_campaigns")
    .select("id,name,format,placement,headline,body,media_url,video_url,cta_label,cta_url,skip_after_seconds,midroll_at_seconds,reel_interval,frequency_cap_per_day,priority,premium_visible")
    .eq("placement", placement)
    .eq("format", format)
    .order("priority", { ascending: false })
    .limit(12)
  return ((data ?? []) as AdCampaign[]).filter(canShowAd)
}

export async function recordAdEvent(campaignId: string, eventType: "impression" | "click" | "skipped" | "complete") {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  await supabase.from("ad_events").insert({ campaign_id: campaignId, user_id: data.user.id, event_type: eventType })
}

export async function viewerIsPremium() {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return false
  const { data: subscription } = await supabase.from("dv_subscriptions").select("status,expires_at").eq("user_id", data.user.id).maybeSingle()
  return subscription?.status === "active" && (!subscription.expires_at || new Date(subscription.expires_at) > new Date())
}

export async function viewerHasAdFreeAccess() {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return false
  const [premium, pass] = await Promise.all([
    viewerIsPremium(),
    supabase.from("user_ad_free_passes").select("expires_at").eq("user_id", data.user.id).maybeSingle(),
  ])
  return premium || Boolean(pass.data?.expires_at && new Date(pass.data.expires_at) > new Date())
}

export async function purchaseAdFreeDay() {
  const { data, error } = await supabase.rpc("purchase_ad_free_day")
  if (error) throw error
  return data as string
}
