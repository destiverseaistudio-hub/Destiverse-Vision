import { Download, Sparkles } from "lucide-react"

import { useContent } from "@/contexts/ContentContext"

export default function UpdateRibbon() {
  const { settings } = useContent()

  if (settings.update_enabled !== "true") {
    return null
  }

  const title = settings.update_title || "A new DestiVerse update is ready"
  const message = settings.update_message || "Discover the latest improvements in DestiVerse Vision."
  const version = settings.update_version || settings.app_version || "Latest release"
  const updateLink = settings.update_link

  const content = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--dv-accent)]/20 text-[var(--dv-accent)]">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-white">
          {title}
          {version ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white/70">{version}</span> : null}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-white/60">{message}</span>
      </span>
    </>
  )

  return (
    <aside className="border-b border-[var(--dv-accent)]/25 bg-[var(--dv-accent)]/[0.09] px-3 py-2.5 sm:px-6" aria-label="App update available">
      <div className="mx-auto flex w-full max-w-[var(--dv-content-max-width)] items-center gap-3">
        {updateLink ? (
          <a className="flex min-w-0 flex-1 items-center gap-3" href={updateLink} target="_blank" rel="noreferrer">
            {content}
          </a>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
        )}
        {updateLink ? (
          <a className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--dv-accent)] px-3 py-2 text-xs font-bold text-white transition hover:bg-[var(--dv-accent-hover)]" href={updateLink} target="_blank" rel="noreferrer">
            <Download className="size-3.5" aria-hidden="true" />
            Update
          </a>
        ) : null}
      </div>
    </aside>
  )
}
