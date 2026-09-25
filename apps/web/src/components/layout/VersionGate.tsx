import { useEffect, useMemo, useState } from "react"
import { RefreshCw } from "lucide-react"

import { useContent } from "@/contexts/ContentContext"
import { compareVersions, isVersionAtLeast } from "@/utils/version"

const APP_VERSION = "1.0.0"

export default function VersionGate({ children }: { children: React.ReactNode }) {
  const { settings } = useContent()
  const [isReady, setIsReady] = useState(false)

  const minimumVersion = settings.minimum_required_version || settings.app_version || null
  const releaseVersion = settings.update_version || settings.app_version || APP_VERSION

  const hasUpdateRequired = useMemo(() => {
    if (!minimumVersion) return false
    return !isVersionAtLeast(APP_VERSION, minimumVersion)
  }, [minimumVersion])

  useEffect(() => {
    const requiredVersion = settings.minimum_required_version || settings.app_version || null
    if (!requiredVersion) {
      setIsReady(true)
      return
    }

    const mustUpdate = compareVersions(APP_VERSION, requiredVersion) < 0
    setIsReady(!mustUpdate)
  }, [settings.app_version, settings.minimum_required_version])

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--dv-background)] px-6 py-10 text-center text-white">
        <section className="w-full max-w-md rounded-3xl border border-[var(--dv-accent)]/25 bg-[var(--dv-surface)] p-8 shadow-[var(--dv-shadow-elevated)]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--dv-accent)]/15 text-[var(--dv-accent)]">
            <RefreshCw className="size-6" aria-hidden="true" />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[var(--dv-accent)]">Update required</p>
          <h1 className="mt-3 text-3xl font-black">A newer DestiVerse version is required.</h1>
          <p className="mt-4 text-sm leading-7 text-white/70">
            This app version {APP_VERSION} is older than the required {minimumVersion || releaseVersion}. Please update before continuing.
          </p>
          {settings.update_link ? (
            <a
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--dv-accent-hover)]"
              href={settings.update_link}
              target="_blank"
              rel="noreferrer"
            >
              Download the update
            </a>
          ) : null}
        </section>
      </main>
    )
  }

  if (hasUpdateRequired) {
    return null
  }

  return <>{children}</>
}
