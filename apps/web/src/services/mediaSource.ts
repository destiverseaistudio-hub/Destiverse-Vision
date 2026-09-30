export type MediaSource =
  | { kind: "direct"; url: string }
  | { kind: "youtube" | "vimeo"; embedUrl: string }
  | { kind: "unsupported"; host: string }

const directExtensions = /\.(mp4|webm|mov|m4v|ogv|ogg|m3u8)(?:$|[?#])/i

export function resolveMediaSource(value?: string): MediaSource | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, "")
    if (host === "youtu.be" || host.endsWith("youtube.com")) {
      const id = host === "youtu.be" ? url.pathname.split("/")[1] : url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]
      if (id && /^[A-Za-z0-9_-]{6,}$/.test(id)) return { kind: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0` }
      return { kind: "unsupported", host }
    }
    if (host === "vimeo.com" || host.endsWith("vimeo.com")) {
      const id = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1]
      if (id) return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}` }
      return { kind: "unsupported", host }
    }
    if (directExtensions.test(url.pathname) || host.endsWith("supabase.co")) return { kind: "direct", url: value }
    return { kind: "unsupported", host }
  } catch {
    return { kind: "unsupported", host: "this address" }
  }
}
