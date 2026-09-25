import { FileUp, Film, Link2, LockKeyhole, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
const currentDirectUploadLimitBytes = 65 * 1024 * 1024
const kinds = [
  ["film", "Film"], ["series", "Series"], ["trailer", "Trailer"], ["documentary", "Documentary"],
  ["music_video", "Music video"], ["podcast", "Podcast video"], ["action_film", "Action film"], ["nollywood", "Nollywood"],
] as const

type Submission = { id: string; title: string; submission_type: string; status: string; moderation_note: string; created_at: string }
type CreatorPlan = { id: string; name: string; price_cents: number; currency: string; features: string[] }
type CloudflareUpload = { upload_url: string; stream_uid: string; playback_url: string; thumbnail_url: string }

const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount / 100)

export default function CreatorFilmStudioPage() {
  const { session } = useAuth()
  const [creatorApproved, setCreatorApproved] = useState(false)
  const [proActive, setProActive] = useState(false)
  const [plans, setPlans] = useState<CreatorPlan[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [source, setSource] = useState<"url" | "upload">("url")
  const [title, setTitle] = useState("")
  const [synopsis, setSynopsis] = useState("")
  const [type, setType] = useState<(typeof kinds)[number][0]>("film")
  const [category, setCategory] = useState("Creator Stories")
  const [language, setLanguage] = useState("English")
  const [ageRating, setAgeRating] = useState("Not rated")
  const [runtime, setRuntime] = useState("")
  const [year, setYear] = useState("")
  const [tags, setTags] = useState("")
  const [posterUrl, setPosterUrl] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")

  const [refreshCount, setRefreshCount] = useState(0)
  const refresh = () => setRefreshCount((c) => c + 1)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    const fetchStudioData = async () => {
      const [application, entitlement, planResult, submissionResult] = await Promise.all([
        supabase.from("creator_applications").select("status").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("creator_plan_subscriptions").select("status,expires_at").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("dv_creator_plans").select("id,name,price_cents,currency,features").eq("active", true),
        supabase.from("creator_content_submissions").select("id,title,submission_type,status,moderation_note,created_at").eq("creator_id", session.user.id).order("created_at", { ascending: false }),
      ])
      if (!active) return
      setCreatorApproved(application.data?.status === "approved")
      setProActive(entitlement.data?.status === "active" && new Date(entitlement.data.expires_at) > new Date())
      setPlans((planResult.data ?? []) as CreatorPlan[])
      setSubmissions((submissionResult.data ?? []) as Submission[])
    }
    void fetchStudioData()
    return () => { active = false }
  }, [session?.user?.id, refreshCount])
  if (!session) return <Navigate to="/" replace />

  const checkout = async (planId: string) => {
    setBusy(true); setNotice("")
    const { data, error } = await supabase.functions.invoke("initialize-paystack-payment", { body: { purpose: "creator_plan", id: planId } })
    if (error || !data?.authorization_url) { setNotice(data?.error || "Creator Pro checkout could not be opened."); setBusy(false); return }
    window.location.assign(data.authorization_url)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!proActive || !rightsConfirmed || !creatorApproved) return
    if (source === "upload" && !file) { setNotice("Choose a video file to upload."); return }
    if (source === "url" && !videoUrl.trim()) { setNotice("Paste the secure video URL."); return }
    if (file && file.size > currentDirectUploadLimitBytes) { setNotice("Choose a video smaller than 65 MB for direct Cloudflare Stream upload."); return }
    setBusy(true); setNotice("")
    let cloudflareUpload: CloudflareUpload | null = null
    if (source === "upload" && file) {
      setNotice("Preparing your private Cloudflare Stream upload…")
      const { data, error } = await supabase.functions.invoke("cloudflare-stream-direct-upload", { body: { file_name: file.name, file_size: file.size, content_type: file.type, max_duration_seconds: runtime ? Number(runtime) * 60 : undefined } })
      if (error || !data?.upload_url || !data?.stream_uid) { setNotice(data?.error || "Cloudflare Stream could not prepare this upload."); setBusy(false); return }
      cloudflareUpload = data as CloudflareUpload
      const body = new FormData(); body.append("file", file, file.name)
      setNotice("Uploading directly to Cloudflare Stream… Keep this page open until it finishes.")
      let response: Response
      try { response = await fetch(cloudflareUpload.upload_url, { method: "POST", body }) } catch { setNotice("Your upload was interrupted. Your video is still selected; please try again."); setBusy(false); return }
      if (!response.ok) { setNotice("Cloudflare did not accept the video. Your video is still selected; please try again."); setBusy(false); return }
    }
    const { error } = await supabase.from("creator_content_submissions").insert({
      creator_id: session.user.id, submission_type: type, title: title.trim(), synopsis: synopsis.trim(), category: category.trim(),
      language: language.trim(), age_rating: ageRating.trim(), runtime_minutes: runtime ? Number(runtime) : null,
      release_year: year ? Number(year) : null, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 12),
      poster_url: posterUrl.trim() || cloudflareUpload?.thumbnail_url || null,
      external_video_url: source === "url" ? videoUrl.trim() : cloudflareUpload?.playback_url || null,
      storage_path: null, rights_confirmed: true,
    })
    if (error) setNotice(error.message)
    else {
      setNotice("Submitted for admin review. It stays private until an administrator approves it for the DestiVerse catalog.")
      setTitle(""); setSynopsis(""); setVideoUrl(""); setFile(null); setPosterUrl(""); setTags(""); setRightsConfirmed(false)
      refresh()
    }
    setBusy(false)
  }

  return <main className="mx-auto max-w-5xl space-y-6 pb-10">
    <Link to="/dashboard/creator-studio" className="inline-flex text-sm text-white/65 hover:text-white">← Back to Creator Studio</Link>
    <section className="rounded-3xl border border-[var(--dv-accent)]/30 bg-gradient-to-br from-[var(--dv-accent)]/20 via-[var(--dv-surface)] to-black p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">Creator Pro</p><h1 className="mt-2 text-3xl font-black text-white">Film Studio</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Submit films, series, trailers, documentaries, Nollywood, action films, music videos, and podcast videos. Every item is private until admin approval publishes it to the catalog.</p></div><Film className="size-11 text-[var(--dv-accent)]" /></div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">Reels are always free for approved creators. Creator Pro is only required for these longer catalog submissions.</div>
    </section>

    {!creatorApproved ? <section className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 text-sm text-amber-100">Your creator account must be approved before you can use Film Studio. <Link className="font-bold underline" to="/dashboard/creator-onboarding">View creator application</Link></section> : null}
    {creatorApproved && !proActive ? <section className="rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-6"><div className="flex items-center gap-2"><LockKeyhole className="size-5 text-[var(--dv-accent)]" /><h2 className="text-xl font-black text-white">Unlock Creator Pro</h2></div><p className="mt-2 text-sm text-slate-400">Choose an optional Creator Pro plan to submit longer catalog videos. This never limits your free Reel uploads.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{plans.map((plan) => <article key={plan.id} className="rounded-2xl border border-white/10 bg-black/20 p-5"><h3 className="font-black text-white">{plan.name}</h3><p className="mt-2 font-bold text-[var(--dv-accent)]">{money(plan.price_cents, plan.currency)}</p><ul className="mt-3 space-y-1 text-sm text-slate-300">{plan.features.map((feature) => <li key={feature}>• {feature}</li>)}</ul><button type="button" disabled={busy} onClick={() => void checkout(plan.id)} className="mt-5 rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Continue to secure checkout</button></article>)}</div>{!plans.length ? <p className="mt-4 text-sm text-slate-400">Creator Pro plans are not published yet. Please check back after the administrator adds one.</p> : null}</section> : null}

    {creatorApproved && proActive ? <section className="rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-6"><div className="flex items-center gap-2"><Sparkles className="size-5 text-[var(--dv-accent)]" /><h2 className="text-xl font-black text-white">New catalog submission</h2></div><form onSubmit={submit} className="mt-5 grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold text-white">Title<input required maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border border-white/15 bg-black/20 p-3" /></label><label className="grid gap-2 text-sm font-semibold text-white">Format<select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="rounded-xl border border-white/15 bg-black/20 p-3">{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><label className="grid gap-2 text-sm font-semibold text-white">Synopsis<textarea required minLength={20} maxLength={3000} value={synopsis} onChange={(event) => setSynopsis(event.target.value)} className="min-h-32 rounded-xl border border-white/15 bg-black/20 p-3" /></label><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="grid gap-2 text-sm text-white">Category<input required maxLength={80} value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-white/15 bg-black/20 p-3" /></label><label className="grid gap-2 text-sm text-white">Language<input required maxLength={50} value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-xl border border-white/15 bg-black/20 p-3" /></label><label className="grid gap-2 text-sm text-white">Runtime (minutes)<input type="number" min="1" max="720" value={runtime} onChange={(event) => setRuntime(event.target.value)} className="rounded-xl border border-white/15 bg-black/20 p-3" /></label><label className="grid gap-2 text-sm text-white">Release year<input type="number" min="1900" max="2100" value={year} onChange={(event) => setYear(event.target.value)} className="rounded-xl border border-white/15 bg-black/20 p-3" /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm text-white">Age rating<input required maxLength={40} value={ageRating} onChange={(event) => setAgeRating(event.target.value)} className="rounded-xl border border-white/15 bg-black/20 p-3" /></label><label className="grid gap-2 text-sm text-white">Tags (comma-separated)<input maxLength={240} value={tags} onChange={(event) => setTags(event.target.value)} className="rounded-xl border border-white/15 bg-black/20 p-3" /></label></div><label className="grid gap-2 text-sm text-white">Cover image URL (optional)<input type="url" value={posterUrl} onChange={(event) => setPosterUrl(event.target.value)} placeholder="https://..." className="rounded-xl border border-white/15 bg-black/20 p-3" /></label><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap gap-3"><button type="button" onClick={() => setSource("url")} className={source === "url" ? "rounded-lg bg-[var(--dv-accent)] px-3 py-2 text-sm font-bold text-white" : "rounded-lg border border-white/15 px-3 py-2 text-sm text-white"}><Link2 className="mr-1 inline size-4" /> Secure video URL</button><button type="button" onClick={() => setSource("upload")} className={source === "upload" ? "rounded-lg bg-[var(--dv-accent)] px-3 py-2 text-sm font-bold text-white" : "rounded-lg border border-white/15 px-3 py-2 text-sm text-white"}><FileUp className="mr-1 inline size-4" /> Upload video</button></div>{source === "url" ? <label className="mt-4 grid gap-2 text-sm text-white">Video URL<input required type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://your-video-host/video.mp4" className="rounded-xl border border-white/15 bg-black/20 p-3" /></label> : <div className="mt-4"><label className="grid gap-2 text-sm text-white">Video file<input required type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="text-sm text-slate-300" /></label><p className="mt-2 text-xs leading-5 text-slate-400">MP4, WebM, or MOV. Direct uploads are currently capped at 50 MB because this Supabase project’s global Storage limit is 50 MB. Use a secure URL for larger work. The requested 65 MB option can be enabled only after the owner upgrades/raises that project-level limit.</p></div>}</div><label className="flex gap-3 text-sm leading-6 text-slate-300"><input required type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} className="mt-1 size-4" />I own this work or have all rights and permissions needed to upload, publish, and monetize it on DestiVerse.</label><button disabled={busy || !rightsConfirmed} className="rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit for admin approval"}</button></form></section> : null}
    <section className="rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-6"><h2 className="text-xl font-black text-white">Your catalog submissions</h2><div className="mt-4 space-y-3">{submissions.length ? submissions.map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap justify-between gap-3"><div><strong className="text-white">{item.title}</strong><p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{item.submission_type.replaceAll("_", " ")} · {item.status}</p>{item.moderation_note ? <p className="mt-2 text-sm text-amber-200">Admin note: {item.moderation_note}</p> : null}</div><span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</span></div></article>) : <p className="text-sm text-slate-400">Your Film Studio submissions will appear here.</p>}</div></section>
    {notice ? <p role="status" className="text-sm text-slate-300">{notice}</p> : null}
  </main>
}
