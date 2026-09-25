import { Cloud, Download, HardDriveDownload, Play, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

import { useContent } from "@/contexts/ContentContext"
import { supabase } from "@/lib/supabase"
import { downloadForOffline, getOfflineRecords, getOfflineVideoUrl, removeOfflineDownload, type OfflineRecord } from "@/services/offline"

type DownloadItem = { id: string; title: string; source: string; kind: "Video" | "Reel" }
type ReelRow = { id: string; title: string; video_url: string }

const formatBytes = (bytes: number) => bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : "Size unavailable"

export default function OfflineWatchPage() {
  const { content } = useContent()
  const [records, setRecords] = useState<OfflineRecord[]>(getOfflineRecords)
  const [reels, setReels] = useState<DownloadItem[]>([])
  const [busyId, setBusyId] = useState("")
  const [message, setMessage] = useState("")
  const [playing, setPlaying] = useState<{ title: string; url: string } | null>(null)
  const [estimate, setEstimate] = useState<{ usage?: number; quota?: number }>({})
  const [driveConnected, setDriveConnected] = useState(false)
  const refresh = () => setRecords(getOfflineRecords())
  const mainVideos: DownloadItem[] = content.filter((item) => item.videoSrc).map((item) => ({ id: `content:${item.id}`, title: item.title, source: item.videoSrc!, kind: "Video" }))

  useEffect(() => {
    void navigator.storage?.estimate?.().then((value) => setEstimate(value))
    void supabase.auth.getSession().then(({ data }) => setDriveConnected(Boolean(data.session?.provider_token)))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setDriveConnected(Boolean(session?.provider_token)))
    const loadReels = async () => {
      const { data } = await supabase.from("reel_submissions").select("id,title,video_url").eq("status", "approved").order("created_at", { ascending: false }).limit(30)
      const signed = await Promise.all(((data ?? []) as ReelRow[]).map(async (reel) => {
        const { data: signedUrl } = await supabase.storage.from("creator-reels").createSignedUrl(reel.video_url, 3600)
        return signedUrl?.signedUrl ? { id: `reel:${reel.id}`, title: reel.title, source: signedUrl.signedUrl, kind: "Reel" as const } : null
      }))
      setReels(signed.filter(Boolean) as DownloadItem[])
    }
    void loadReels()
    return () => listener.subscription.unsubscribe()
  }, [])

  const save = async (item: DownloadItem) => {
    setBusyId(item.id); setMessage("")
    try { await downloadForOffline(item); refresh(); setMessage(`${item.title} is ready for offline viewing on this device.`) }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not download this video.") }
    finally { setBusyId("") }
  }
  const watch = async (record: OfflineRecord) => {
    try { setPlaying({ title: record.title, url: await getOfflineVideoUrl(record) }) }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not open offline video.") }
  }
  const requestGoogleDrivePermission = async () => {
    setMessage("")
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard/offline`, scopes: "https://www.googleapis.com/auth/drive.file", queryParams: { prompt: "consent" } } })
    if (error) setMessage(error.message)
  }
  const available = [...mainVideos, ...reels]

  return <main className="mx-auto max-w-5xl space-y-7 pb-10">
    <section className="rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">Your device</p><h1 className="mt-2 text-3xl font-black text-white">Offline Watch</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Download videos and Reels into this browser for offline playback. You control every download and can remove it whenever you want.</p></div><HardDriveDownload className="size-10 text-[var(--dv-accent)]" /></div><p className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">Browser storage: {estimate.quota ? `${formatBytes(estimate.usage ?? 0)} used of ${formatBytes(estimate.quota)}` : "storage estimate unavailable"}. Storage capacity is set by the device and browser; DestiVerse cannot reserve a fixed amount.</p></section>

    <section><h2 className="text-xl font-black text-white">Available downloads</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{available.map((item) => <article key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[var(--dv-surface)] p-4"><div className="min-w-0"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.kind}</span><strong className="block truncate text-sm text-white">{item.title}</strong></div><button type="button" disabled={Boolean(busyId)} onClick={() => void save(item)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--dv-accent)] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Download className="size-4" /> {busyId === item.id ? "Downloading..." : "Offline"}</button></article>)}</div>{!available.length ? <p className="mt-4 text-sm text-slate-400">No downloadable videos are available yet.</p> : null}</section>

    <section><h2 className="text-xl font-black text-white">Saved offline</h2>{records.length ? <div className="mt-4 grid gap-3">{records.map((record) => <article key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[var(--dv-surface)] p-4"><div><strong className="block text-white">{record.title}</strong><span className="text-xs text-slate-400">{formatBytes(record.bytes)} · saved {new Date(record.savedAt).toLocaleDateString()}</span></div><div className="flex gap-2"><button type="button" onClick={() => void watch(record)} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-black"><Play className="size-4 fill-current" /> Watch</button><button type="button" onClick={() => void removeOfflineDownload(record.id).then(refresh)} className="grid size-9 place-items-center rounded-xl border border-red-400/30 text-red-200" aria-label={`Remove ${record.title}`}><Trash2 className="size-4" /></button></div></article>)}</div> : <p className="mt-4 text-sm text-slate-400">Nothing downloaded yet.</p>}</section>

    <section className="rounded-3xl border border-white/10 bg-black/20 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex max-w-2xl items-start gap-3"><Cloud className="mt-0.5 size-5 shrink-0 text-[var(--dv-accent)]" /><div><h2 className="font-black text-white">Optional Google Drive access</h2><p className="mt-1 text-sm leading-6 text-slate-400">This is optional. Selecting Connect opens Google’s consent screen. Each person can accept or decline. If accepted, DestiVerse receives only the narrow permission to work with Drive files the person explicitly chooses or creates—not their whole Drive. Offline Watch remains available if they decline.</p>{driveConnected ? <p className="mt-2 text-xs font-bold text-emerald-300">Google connection active for this sign-in.</p> : null}</div></div><button type="button" onClick={() => void requestGoogleDrivePermission()} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white hover:bg-white/10">{driveConnected ? "Reconnect Google Drive" : "Connect Google Drive"}</button></div></section>

    {message ? <p role="status" className="text-sm text-slate-300">{message}</p> : null}
    {playing ? <div className="fixed inset-0 z-[90] grid place-items-center bg-black/85 p-5"><section className="w-full max-w-lg overflow-hidden rounded-3xl bg-black"><video controls autoPlay playsInline src={playing.url} className="max-h-[75dvh] w-full" /><div className="flex items-center justify-between p-4"><strong className="text-white">{playing.title}</strong><button type="button" onClick={() => { URL.revokeObjectURL(playing.url); setPlaying(null) }} className="rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-white">Close</button></div></section></div> : null}
  </main>
}
