export const runningBuildId = __DESTIVERSE_BUILD_ID__

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

export async function activateLatestApp() {
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  if (registration) {
    await registration.update()
    if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" })
  }
  window.sessionStorage.setItem("dv-refresh-path", `${window.location.pathname}${window.location.search}${window.location.hash}`)
  window.location.reload()
}

export function registerAppServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("DestiVerse service worker registration failed", error))
  }, { once: true })
}
