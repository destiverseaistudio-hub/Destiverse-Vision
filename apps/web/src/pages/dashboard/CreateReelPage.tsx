import { AtSign, Bot, ChevronLeft, Globe2, Hash, Lock, Music2, Upload, Video } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { uploadWithRetry } from "@/services/uploads"

const maxReelUploadBytes = 50 * 1024 * 1024
type Approval = "loading" | "missing" | "pending" | "declined" | "suspended" | "approved"

export default function CreateReelPage() {
  const { session } = useAuth()
  const [searchParams] = useSearchParams()
  const [title, setTitle] = useState("")
  const [caption, setCaption] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("public")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [approval, setApproval] = useState<Approval>("loading")
  const [dailyCount, setDailyCount] = useState(0)
  const [soundFile, setSoundFile] = useState<File | null>(null)
  const [soundLabel, setSoundLabel] = useState(() => searchParams.get("sound") ?? "")
  const [soundPreview, setSoundPreview] = useState("")
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState<"idle" | "uploading" | "processing">("idle")
  const [message, setMessage] = useState("")
  const [aiBusy, setAiBusy] = useState(false)
  const [aiRemaining, setAiRemaining] = useState<number | null>(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); if (soundPreview) URL.revokeObjectURL(soundPreview) }, [preview, soundPreview])
  useEffect(() => {
    if (!session) return
    void Promise.all([
      supabase.from("creator_applications").select("status").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("reel_submissions").select("id", { count: "exact", head: true }).eq("creator_id", session.user.id).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]).then(([{ data: application }, { count }]) => { setApproval((application?.status ?? "missing") as Approval); setDailyCount(count ?? 0) })
  }, [session])

  const chooseVideo = (next: File | null) => { if (preview) URL.revokeObjectURL(preview); setFile(next); setPreview(next ? URL.createObjectURL(next) : "") }
  const chooseSound = (next: File | null) => { if (soundPreview) URL.revokeObjectURL(soundPreview); setSoundFile(next); setSoundLabel(next ? next.name.replace(/\.[^/.]+$/, "") : ""); setSoundPreview(next ? URL.createObjectURL(next) : "") }
  const addCaptionToken = (token: string) => setCaption((value) => `${value}${value && !value.endsWith(" ") ? " " : ""}${token}`)

  async function fillWithAi() {
    if (!title.trim() && !caption.trim() && !file) return setMessage("Add a title, caption, or video so Creator AI has context.")
    setAiBusy(true); setMessage("")
    const { data, error } = await supabase.functions.invoke("creator-reel-assist", { body: { title, description: caption, file_name: file?.name } })
    if (error || !data) setMessage(data?.error || "Creator AI could not prepare a draft.")
    else { setTitle(data.title || title); setCaption(data.caption || caption); if (!soundFile) setSoundLabel(data.sound_label || soundLabel); setAiRemaining(typeof data.remaining === "number" ? data.remaining : null); setMessage("AI draft ready. Review it before submitting.") }
    setAiBusy(false)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!session || !file || approval !== "approved") return
    if (dailyCount >= 10) return setMessage("Your daily 10-Reel limit has been reached. Try again tomorrow.")
    if (file.size > maxReelUploadBytes) return setMessage("Choose a video smaller than 50 MB, then try again.")
    const path = `${session.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`
    const selectedSound = soundFile ? soundFile.name.replace(/\.[^/.]+$/, "") : soundLabel.trim()
    setBusy(true); setStage("uploading"); setMessage("Uploading your Reel securely. Keep this page open until it completes.")
    const { error: uploadError } = await uploadWithRetry("creator-reels", path, file, { contentType: file.type || undefined, cacheControl: "31536000", upsert: false })
    if (uploadError) { setMessage(`Upload failed: ${uploadError.message || "The storage service did not accept the video."}`); setStage("idle"); setBusy(false); return }
    const { data: submission, error } = await supabase.from("reel_submissions").insert({ creator_id: session.user.id, title: title.trim(), caption: caption.trim(), video_url: path, audio_label: selectedSound || null, visibility }).select("id,status").single()
    if (error || !submission) { await supabase.storage.from("creator-reels").remove([path]); setMessage(error?.message || "Could not submit your Reel."); setStage("idle"); setBusy(false); return }
    setStage("processing")
    const { data: review, error: reviewError } = await supabase.functions.invoke("reel-auto-review", { body: { reelId: submission.id } })
    setMessage(submission.status === "removed" ? "Your upload limit was exceeded. Creator access has been paused for review." : reviewError ? "Submitted for admin review. Automated triage is temporarily unavailable." : `Submitted for review. ${review?.notice || "An admin will review it before it appears in the feed."}`)
    setDailyCount((value) => value + 1); chooseVideo(null); chooseSound(null); setTitle(""); setCaption(""); setStage("idle"); setBusy(false)
  }

  const status: Record<Approval, string> = { loading: "Checking creator access…", missing: "Finish your creator application before uploading.", pending: "Your creator application is being reviewed.", declined: "Your creator application needs an update before you can upload.", suspended: "Uploads are paused while an admin reviews your account.", approved: `Creator access active · ${dailyCount}/10 uploads used today.` }
  const blocked = approval !== "approved" && approval !== "loading"
  return <main className="mx-auto max-w-4xl pb-10"><Link to="/dashboard/reels" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ChevronLeft className="size-4" />Back to Reels</Link><section className="mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--dv-surface)]"><header className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,.24),transparent_28rem)] p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">Creator studio</p><h1 className="mt-2 text-3xl font-black text-white">Publish a Reel</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{status[approval]}</p></header>{blocked ? <div className="p-5 sm:p-7"><Link to="/dashboard/creator-onboarding" className="inline-flex rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white">{approval === "missing" || approval === "declined" ? "Open creator application" : "View creator status"}</Link></div> : <form onSubmit={submit} className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="grid min-w-0 content-start gap-5"><div><label className="text-sm font-bold text-white">Describe your video</label><textarea required maxLength={500} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Tell viewers what makes this Reel worth watching…" className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-white/15 bg-black/20 p-4 text-base text-white outline-none placeholder:text-slate-500 focus:border-[var(--dv-accent)]" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => addCaptionToken("#")} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200"><Hash className="size-3.5" />Hashtag</button><button type="button" onClick={() => addCaptionToken("@") } className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200"><AtSign className="size-3.5" />Mention</button><Link to="/dashboard/sounds" className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200"><Music2 className="size-3.5" />Sounds</Link></div></div><label className="grid gap-2 text-sm font-bold text-white">Reel title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give your Reel a clear title" className="rounded-xl border border-white/15 bg-black/20 p-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-[var(--dv-accent)]" /></label><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-white">Who can watch this Reel?</p><p className="mt-1 text-xs leading-5 text-slate-400">Public Reels can appear after approval. Private Reels stay in your profile.</p></div><Globe2 className="size-5 shrink-0 text-[var(--dv-accent)]" /></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setVisibility("public")} className={`rounded-xl border p-3 text-left text-sm font-bold ${visibility === "public" ? "border-[var(--dv-accent)] bg-[var(--dv-accent)]/15 text-white" : "border-white/10 text-slate-400"}`}><Globe2 className="mb-2 size-4" />Everyone</button><button type="button" onClick={() => setVisibility("private")} className={`rounded-xl border p-3 text-left text-sm font-bold ${visibility === "private" ? "border-[var(--dv-accent)] bg-[var(--dv-accent)]/15 text-white" : "border-white/10 text-slate-400"}`}><Lock className="mb-2 size-4" />Only me</button></div></div><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-white">Creator assist</p><p className="mt-1 text-xs leading-5 text-slate-400">Build a starting title, caption, and sound label from your Reel details.</p></div><button type="button" onClick={() => void fillWithAi()} disabled={aiBusy || (!title.trim() && !caption.trim() && !file)} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Bot className="size-4" />{aiBusy ? "Drafting…" : "AI fill"}</button></div>{aiRemaining !== null ? <p className="mt-3 text-xs font-bold text-[var(--dv-accent)]">{aiRemaining} free drafts left this week</p> : null}</div><details className="rounded-2xl border border-white/10 bg-black/15 p-4"><summary className="cursor-pointer text-sm font-bold text-white">Publishing notes</summary><p className="mt-3 text-xs leading-5 text-slate-400">Mentions and hashtags are included in your caption. Comments are available on public, approved Reels. Only upload video and audio you have the right to share.</p></details></div><aside className="grid content-start gap-4"><label className="grid min-h-56 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-white/25 bg-black/30 p-4 text-center transition hover:border-[var(--dv-accent)]"><input required type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => chooseVideo(event.target.files?.[0] ?? null)} className="sr-only" />{preview ? <video src={preview} muted playsInline className="h-52 w-full rounded-xl object-cover" /> : <span><Upload className="mx-auto size-8 text-[var(--dv-accent)]" /><strong className="mt-3 block text-sm text-white">Select video</strong><small className="mt-1 block text-xs text-slate-400">MP4, WebM, or MOV · 50 MB max</small></span>}</label><label className="grid gap-2 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm font-bold text-white">Add a sound<input type="file" accept="audio/*" onChange={(event) => chooseSound(event.target.files?.[0] ?? null)} className="text-xs font-normal text-slate-300" /></label>{soundPreview ? <div className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-bold text-white">{soundLabel || "Selected sound"}</p><button type="button" onClick={() => chooseSound(null)} className="text-xs font-bold text-slate-300">Remove</button></div><audio controls src={soundPreview} className="mt-3 w-full" /></div> : null}<button disabled={busy || dailyCount >= 10 || approval !== "approved"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-black text-white disabled:opacity-60"><Video className="size-4" />{busy ? stage === "processing" ? "Checking submission…" : "Uploading…" : "Submit for approval"}</button></aside></form>}{message ? <p role="status" className="mx-5 mb-5 rounded-xl border border-white/10 bg-black/15 p-3 text-sm text-slate-300 sm:mx-7 sm:mb-7">{message}</p> : null}</section></main>
}
