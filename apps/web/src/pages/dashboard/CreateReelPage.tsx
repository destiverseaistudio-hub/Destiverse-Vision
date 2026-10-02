import { AtSign, ChevronLeft, Globe2, Hash, Image, MapPin, SlidersHorizontal, Upload, Video } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { uploadWithRetry } from "@/services/uploads"

const maxUploadBytes = 50 * 1024 * 1024
type Approval = "loading" | "missing" | "pending" | "declined" | "suspended" | "approved"
type MediaType = "video" | "image"
type Place = { id: number; name: string; label: string; latitude: number; longitude: number }

export default function CreateReelPage() {
  const { session } = useAuth()
  const [params] = useSearchParams()
  const [screen, setScreen] = useState<"choose" | "edit" | "publish">("choose")
  const [approval, setApproval] = useState<Approval>("loading")
  const [dailyCount, setDailyCount] = useState(0)
  const [media, setMedia] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>("video")
  const [mediaPreview, setMediaPreview] = useState("")
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState("")
  const [overlayText, setOverlayText] = useState("")
  const [filter, setFilter] = useState<"none" | "vivid" | "mono" | "warm">("none")
  const [title, setTitle] = useState("")
  const [caption, setCaption] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("public")
  const [soundLabel, setSoundLabel] = useState(() => params.get("sound") ?? "")
  const [locationQuery, setLocationQuery] = useState("")
  const [places, setPlaces] = useState<Place[]>([])
  const [place, setPlace] = useState<Place | null>(null)
  const [locationBusy, setLocationBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview); if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview) }, [mediaPreview, thumbnailPreview])
  useEffect(() => {
    if (!session) return
    void Promise.all([
      supabase.from("creator_applications").select("status").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("reel_submissions").select("id", { count: "exact", head: true }).eq("creator_id", session.user.id).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]).then(([{ data: application }, { count }]) => { setApproval((application?.status ?? "missing") as Approval); setDailyCount(count ?? 0) })
  }, [session])

  const chooseMedia = (next: File | null, type: MediaType) => {
    if (!next) return
    if (next.size > maxUploadBytes) return setMessage("Choose media smaller than 50 MB, then try again.")
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMedia(next); setMediaType(type); setMediaPreview(URL.createObjectURL(next)); setMessage(""); setScreen("edit")
  }
  const chooseThumbnail = (next: File | null) => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
    setThumbnail(next); setThumbnailPreview(next ? URL.createObjectURL(next) : "")
  }
  const searchLocations = async () => {
    const query = locationQuery.trim()
    if (query.length < 2) return setMessage("Enter at least two characters to search for a city or area.")
    setLocationBusy(true); setMessage("")
    const { data, error } = await supabase.functions.invoke("search-reel-location", { body: { query } })
    if (error || !data) setMessage(data?.error || "Location search is unavailable right now.")
    else { setPlaces((data.results ?? []) as Place[]); if (!(data.results ?? []).length) setMessage("No matching city or area was found.") }
    setLocationBusy(false)
  }
  const addCaptionToken = (token: string) => setCaption((value) => `${value}${value && !value.endsWith(" ") ? " " : ""}${token}`)
  const previewFilter: Record<typeof filter, string> = { none: "none", vivid: "saturate(1.45) contrast(1.08)", mono: "grayscale(1) contrast(1.08)", warm: "sepia(.24) saturate(1.2)" }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!session || !media || !thumbnail || approval !== "approved") return
    if (dailyCount >= 10) return setMessage("Your daily 10-Reel limit has been reached. Try again tomorrow.")
    setBusy(true); setMessage("Uploading your Reel and vertical thumbnail securely. Keep this page open.")
    const base = `${session.user.id}/${Date.now()}`
    const mediaPath = `${base}-media-${media.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`
    const thumbnailPath = `${base}-cover-${thumbnail.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`
    const [mediaUpload, thumbnailUpload] = await Promise.all([
      uploadWithRetry("creator-reels", mediaPath, media, { contentType: media.type || undefined, cacheControl: "31536000", upsert: false }),
      uploadWithRetry("creator-reels", thumbnailPath, thumbnail, { contentType: thumbnail.type || undefined, cacheControl: "31536000", upsert: false }),
    ])
    if (mediaUpload.error || thumbnailUpload.error) { await supabase.storage.from("creator-reels").remove([mediaPath, thumbnailPath]); setMessage(`Upload failed: ${(mediaUpload.error || thumbnailUpload.error)?.message || "The storage service did not accept the files."}`); setBusy(false); return }
    const { data: submission, error } = await supabase.from("reel_submissions").insert({ creator_id: session.user.id, title: title.trim(), caption: caption.trim(), video_url: mediaPath, poster_url: thumbnailPath, visibility, media_type: mediaType, location_label: place?.label ?? null, location_latitude: place?.latitude ?? null, location_longitude: place?.longitude ?? null, editor_settings: { overlay_text: overlayText.trim(), filter }, audio_label: soundLabel.trim() || null }).select("id,status").single()
    if (error || !submission) { await supabase.storage.from("creator-reels").remove([mediaPath, thumbnailPath]); setMessage(error?.message || "Could not submit your Reel."); setBusy(false); return }
    const { data: review, error: reviewError } = await supabase.functions.invoke("reel-auto-review", { body: { reelId: submission.id } })
    setMessage(submission.status === "removed" ? "Your upload limit was exceeded. Creator access has been paused for review." : reviewError ? "Submitted for admin review. Automated triage is temporarily unavailable." : `Submitted for review. ${review?.notice || "An admin will review it before it appears in the feed."}`)
    setDailyCount((value) => value + 1); setBusy(false)
  }

  const access: Record<Approval, string> = { loading: "Checking creator access…", missing: "Finish your creator application before uploading.", pending: "Your creator application is being reviewed.", declined: "Your creator application needs an update before you can upload.", suspended: "Uploads are paused while an admin reviews your account.", approved: `Creator access active · ${dailyCount}/10 uploads used today.` }
  if (!session) return null
  if (approval !== "approved" && approval !== "loading") return <main className="mx-auto max-w-xl pb-10"><Link to="/dashboard/reels" className="inline-flex items-center gap-2 text-sm text-white/60"><ChevronLeft className="size-4" />Back to Reels</Link><section className="mt-5 rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-6"><h1 className="text-2xl font-black text-white">Creator upload</h1><p className="mt-3 text-sm text-slate-400">{access[approval]}</p><Link to="/dashboard/creator-onboarding" className="mt-5 inline-flex rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white">Open creator application</Link></section></main>

  return <main className="mx-auto max-w-4xl pb-10"><Link to={screen === "choose" ? "/dashboard/reels" : "#"} onClick={(event) => { if (screen !== "choose") { event.preventDefault(); setScreen(screen === "publish" ? "edit" : "choose") } }} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ChevronLeft className="size-4" />{screen === "choose" ? "Back to Reels" : "Back"}</Link><section className="mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--dv-surface)]"><header className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,.24),transparent_28rem)] p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">DestiVerse creator studio</p><h1 className="mt-2 text-3xl font-black text-white">{screen === "choose" ? "Start a new Reel" : screen === "edit" ? "Shape your moment" : "Publish your Reel"}</h1><p className="mt-2 text-sm text-slate-400">{access[approval]}</p><div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-black uppercase tracking-wide"><span className={screen === "choose" ? "text-white" : "text-slate-500"}>1 · Media</span><span className={screen === "edit" ? "text-white" : "text-slate-500"}>2 · Edit</span><span className={screen === "publish" ? "text-white" : "text-slate-500"}>3 · Publish</span></div></header>{screen === "choose" ? <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7"><label className="group grid min-h-64 cursor-pointer place-items-center rounded-3xl border border-white/10 bg-black/20 p-6 text-center transition hover:border-[var(--dv-accent)] hover:bg-[var(--dv-accent)]/10"><input className="sr-only" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => chooseMedia(event.target.files?.[0] ?? null, "video")} /><span><Video className="mx-auto size-10 text-[var(--dv-accent)]" /><strong className="mt-4 block text-lg text-white">Upload video</strong><small className="mt-2 block max-w-52 text-xs leading-5 text-slate-400">MP4, WebM, or MOV. Add your finishing details in the studio.</small></span></label><label className="group grid min-h-64 cursor-pointer place-items-center rounded-3xl border border-white/10 bg-black/20 p-6 text-center transition hover:border-[var(--dv-accent)] hover:bg-[var(--dv-accent)]/10"><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => chooseMedia(event.target.files?.[0] ?? null, "image")} /><span><Image className="mx-auto size-10 text-[var(--dv-accent)]" /><strong className="mt-4 block text-lg text-white">Create an image Reel</strong><small className="mt-2 block max-w-52 text-xs leading-5 text-slate-400">A still visual with your caption and creative treatment.</small></span></label></div> : null}{screen === "edit" && media ? <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_18rem]"><div className="relative mx-auto aspect-[9/14] w-full max-w-sm overflow-hidden rounded-[2rem] bg-black"><>{mediaType === "video" ? <video src={mediaPreview} controls playsInline className="h-full w-full object-contain" style={{ filter: previewFilter[filter] }} /> : <img src={mediaPreview} alt="Selected Reel" className="h-full w-full object-cover" style={{ filter: previewFilter[filter] }} />}</>{overlayText ? <span className="pointer-events-none absolute inset-x-5 bottom-12 text-center text-xl font-black leading-tight text-white [text-shadow:0_2px_10px_rgb(0_0_0_/_0.9)]">{overlayText}</span> : null}</div><div className="grid content-start gap-4"><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><SlidersHorizontal className="size-5 text-[var(--dv-accent)]" /><label className="mt-3 grid gap-2 text-sm font-bold text-white">On-screen text<input maxLength={120} value={overlayText} onChange={(event) => setOverlayText(event.target.value)} placeholder="Add a short message" className="rounded-xl border border-white/15 bg-black/25 p-3 text-white" /></label><label className="mt-4 grid gap-2 text-sm font-bold text-white">Visual treatment<select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-white/15 bg-black/25 p-3 text-white"><option value="none">Natural</option><option value="vivid">Vivid</option><option value="warm">Warm glow</option><option value="mono">Mono</option></select></label><p className="mt-3 text-xs leading-5 text-slate-400">Your selected text and treatment are saved with the Reel and shown in DestiVerse.</p></div><button type="button" onClick={() => setScreen("publish")} className="rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-black text-white">Next: publishing details</button></div></div> : null}{screen === "publish" && media ? <form onSubmit={submit} className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="grid content-start gap-5"><div><label className="text-sm font-bold text-white">Describe your Reel</label><textarea required maxLength={500} value={caption} onChange={(event) => setCaption(event.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-white/15 bg-black/20 p-4 text-white" placeholder="Tell viewers what this moment is about…" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => addCaptionToken("#")} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200"><Hash className="size-3.5" />Hashtag</button><button type="button" onClick={() => addCaptionToken("@") } className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200"><AtSign className="size-3.5" />Mention</button></div></div><label className="grid gap-2 text-sm font-bold text-white">Reel title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border border-white/15 bg-black/20 p-3 text-white" placeholder="Give your Reel a clear title" /></label><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex items-center gap-2"><MapPin className="size-5 text-[var(--dv-accent)]" /><p className="text-sm font-bold text-white">Add location</p></div><div className="mt-3 flex gap-2"><input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchLocations() } }} placeholder="Search city or area" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/25 p-3 text-sm text-white" /><button type="button" onClick={() => void searchLocations()} disabled={locationBusy} className="rounded-xl border border-white/15 px-3 text-xs font-bold text-white disabled:opacity-50">{locationBusy ? "Searching" : "Search"}</button></div>{places.length ? <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-white/10">{places.map((result) => <button key={result.id} type="button" onClick={() => { setPlace(result); setPlaces([]); setLocationQuery(result.label) }} className="block w-full border-b border-white/5 px-3 py-2 text-left text-xs text-slate-200 last:border-0 hover:bg-white/5">{result.label}</button>)}</div> : null}{place ? <p className="mt-3 text-xs font-bold text-[var(--dv-accent)]">Location: {place.label}</p> : <p className="mt-3 text-xs text-slate-500">Optional. Search is for cities and areas; no device location is collected.</p>}</div><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-sm font-bold text-white">Who can watch this Reel?</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setVisibility("public")} className={`rounded-xl border p-3 text-left text-sm font-bold ${visibility === "public" ? "border-[var(--dv-accent)] bg-[var(--dv-accent)]/15 text-white" : "border-white/10 text-slate-400"}`}><Globe2 className="mb-2 size-4" />Everyone</button><button type="button" onClick={() => setVisibility("private")} className={`rounded-xl border p-3 text-left text-sm font-bold ${visibility === "private" ? "border-[var(--dv-accent)] bg-[var(--dv-accent)]/15 text-white" : "border-white/10 text-slate-400"}`}><span className="mb-2 block text-base">◉</span>Only me</button></div></div><label className="grid gap-2 text-sm font-bold text-white">Sound label (optional)<input maxLength={100} value={soundLabel} onChange={(event) => setSoundLabel(event.target.value)} className="rounded-xl border border-white/15 bg-black/20 p-3 text-white" placeholder="Original sound" /></label></div><aside className="grid content-start gap-4"><label className="grid min-h-64 cursor-pointer place-items-center overflow-hidden rounded-3xl border border-dashed border-white/25 bg-black/30 p-4 text-center hover:border-[var(--dv-accent)]"><input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseThumbnail(event.target.files?.[0] ?? null)} className="sr-only" />{thumbnailPreview ? <img src={thumbnailPreview} alt="Vertical thumbnail preview" className="h-56 w-full rounded-2xl object-cover" /> : <span><Upload className="mx-auto size-8 text-[var(--dv-accent)]" /><strong className="mt-3 block text-sm text-white">Upload vertical thumbnail</strong><small className="mt-1 block text-xs text-slate-400">A 9:16 image works best</small></span>}</label><p className="text-xs leading-5 text-slate-500">Public Reels are reviewed before publishing. By submitting, you confirm you have the rights to share the media.</p><button disabled={busy || dailyCount >= 10 || !thumbnail} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-black text-white disabled:opacity-60"><Upload className="size-4" />{busy ? "Uploading…" : "Submit for approval"}</button></aside></form> : null}{message ? <p role="status" className="mx-5 mb-5 rounded-xl border border-white/10 bg-black/15 p-3 text-sm text-slate-300 sm:mx-7 sm:mb-7">{message}</p> : null}</section></main>
}
