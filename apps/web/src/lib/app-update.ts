// Vite replaces this at build time. Keeping it on import.meta.env avoids a
// bare browser global that could crash a deployed bundle.
export const runningBuildId = import.meta.env.VITE_APP_BUILD_ID || "unknown"

export type VersionManifest = {
  app: string
  version: string
  buildId: string
  environment: string
}

export async function fetchLatestVersion() {
  const response = await fetch(`/api/version?ts=${Date.now()}`, { cache: "no-store" })
  if (!response.ok) throw new Error(`Version check failed (${response.status})`)
  return response.json() as Promise<VersionManifest>
}

export async function activateLatestApp(buildId?: string) {
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  if (registration) {
    await registration.update()
    if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" })
  }
  if (buildId) window.localStorage.setItem("dv-last-acknowledged-build", buildId)
  window.sessionStorage.setItem("dv-refresh-path", `${window.location.pathname}${window.location.search}${window.location.hash}`)
  window.location.reload()
}

export function registerAppServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("DestiVerse service worker registration failed", error))
  }, { once: true })
}
