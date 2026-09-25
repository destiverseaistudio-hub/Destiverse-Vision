import { ArrowRight, Download, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"

import { ContentProvider, useContent } from "@/contexts/ContentContext"

function UpdatesContent() {
  const { settings } = useContent()
  const version = settings.update_version || settings.app_version || "Latest release"
  const title = settings.update_title || "DestiVerse Vision updates"
  const message = settings.update_message || "We are continually improving DestiVerse Vision for a better viewing experience."
  const releaseNotes = settings.release_notes || settings.update_message || ""
  const announcement = settings.announcement
  const updateLink = settings.update_link
  const hasExternalUpdateLink = Boolean(updateLink && !/\/updates\/?$/i.test(updateLink))

  return (
    <main className="flex min-h-screen items-center bg-[var(--dv-background)] px-4 py-10 text-[var(--dv-foreground)] sm:px-6">
      <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[var(--dv-surface)] shadow-[var(--dv-shadow-elevated)]">
        <div className="border-b border-white/10 bg-gradient-to-br from-[var(--dv-accent)]/20 via-[var(--dv-surface)] to-[var(--dv-surface)] px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--dv-accent)] text-white shadow-lg shadow-[var(--dv-accent)]/20">
            <Sparkles className="size-6" aria-hidden="true" />
          </div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[var(--dv-accent)]">{version}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/70 sm:text-base">{message}</p>
        </div>

        <div className="px-6 py-7 sm:px-10 sm:py-9">
          {announcement ? (
            <div className="rounded-xl border border-[var(--dv-accent)]/25 bg-[var(--dv-accent)]/10 px-4 py-3 text-sm leading-6 text-white/85">
              {announcement}
            </div>
          ) : null}

          {releaseNotes ? (
            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Release notes</p>
              <div className="mt-3 space-y-2 text-sm leading-7 text-white/75">
                {releaseNotes.split(/\n+/).filter(Boolean).map((note, index) => (
                  <p key={`${note}-${index}`}>{note}</p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {hasExternalUpdateLink ? (
              <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--dv-accent)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--dv-accent-hover)]" href={updateLink} target="_blank" rel="noreferrer">
                <Download className="size-4" aria-hidden="true" />
                Get the update
              </a>
            ) : null}
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]" to="/">
              Go to DestiVerse Vision
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function UpdatesPage() {
  return (
    <ContentProvider>
      <UpdatesContent />
    </ContentProvider>
  )
}
