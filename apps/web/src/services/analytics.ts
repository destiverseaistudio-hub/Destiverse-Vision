import { supabase } from "@/lib/supabase"

export async function trackContentEvent(
  contentId: string,
  eventType: "view" | "play_start",
) {
  const { data } = await supabase.auth.getUser()
  await supabase.from("content_events").insert({
    content_id: contentId,
    event_type: eventType,
    user_id: data.user?.id ?? null,
  })
}
