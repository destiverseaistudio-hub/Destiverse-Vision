import { supabase } from "@/lib/supabase"

function toUint8Array(value: string) {
  const padded = `${value}${"=".repeat((4 - value.length % 4) % 4)}`.replace(/-/g, "+").replace(/_/g, "/")
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

export async function enablePushNotifications() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Push notifications are not supported by this browser.")
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!publicKey) throw new Error("Push notifications are not configured yet.")
  if (await Notification.requestPermission() !== "granted") throw new Error("Notification permission was not granted.")
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Sign in before enabling notifications.")
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(publicKey) })
  const json = subscription.toJSON()
  const { error } = await supabase.from("push_subscriptions").upsert({ user_id: auth.user.id, endpoint: subscription.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, user_agent: navigator.userAgent, active: true }, { onConflict: "endpoint" })
  if (error) throw error
}
