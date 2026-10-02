const cacheName = "destiverse-offline-v1"
const recordsKey = "destiverse-offline-records"

export type OfflineRecord = { id: string; title: string; source: string; savedAt: string; bytes: number; kind: "Video" | "Reel" }

function readRecords(): OfflineRecord[] {
  try { const data = JSON.parse(localStorage.getItem(recordsKey) ?? "[]"); return Array.isArray(data) ? data.map((item) => ({ ...item, kind: item.kind === "Reel" || String(item.id).startsWith("reel:") ? "Reel" : "Video" })) : [] } catch { return [] }
}
function writeRecords(records: OfflineRecord[]) { localStorage.setItem(recordsKey, JSON.stringify(records)) }

export function getOfflineRecords() { return readRecords() }
export function isItemDownloaded(id: string): boolean { return readRecords().some(record => record.id === id) }

export async function requestDeviceStoragePermission() {
  if (!navigator.storage?.persist) return false
  return navigator.storage.persist()
}

export async function getDeviceStorageEstimate() {
  return navigator.storage?.estimate?.() ?? {}
}

export async function downloadForOffline(item: { id: string; title: string; source: string; kind: "Video" | "Reel" }) {
  const response = await fetch(item.source)
  if (!response.ok) throw new Error(`Download failed (${response.status}).`)
  const bytes = Number(response.headers.get("content-length") ?? 0)
  if (bytes > 100 * 1024 * 1024) throw new Error("This download is larger than the 100 MB device-download limit.")
  const estimate = await getDeviceStorageEstimate()
  if (bytes && estimate.quota && (estimate.usage ?? 0) + bytes > estimate.quota) throw new Error("Your device does not have enough browser storage for this download.")
  const copy = response.clone()
  const cache = await caches.open(cacheName)
  await cache.put(item.source, copy)
  const records = readRecords().filter(record => record.id !== item.id)
  writeRecords([{ id: item.id, title: item.title, source: item.source, kind: item.kind, savedAt: new Date().toISOString(), bytes }, ...records])
}

export async function removeOfflineDownload(id: string) {
  const record = readRecords().find(item => item.id === id)
  if (record) await (await caches.open(cacheName)).delete(record.source)
  writeRecords(readRecords().filter(item => item.id !== id))
}

export async function clearOfflineDownloads() {
  await caches.delete(cacheName)
  writeRecords([])
}

export async function clearAppCache() {
  const names = await caches.keys()
  await Promise.all(names.filter((name) => name !== cacheName).map((name) => caches.delete(name)))
}

export async function getOfflineVideoUrl(record: OfflineRecord) {
  const response = await (await caches.open(cacheName)).match(record.source)
  if (!response) throw new Error("This offline file is no longer available on this device.")
  return URL.createObjectURL(await response.blob())
}

export async function copyOfflineDownloadToGoogleDrive(record: OfflineRecord, accessToken: string) {
  const response = await (await caches.open(cacheName)).match(record.source)
  if (!response) throw new Error("Download this item to this device before copying it to Google Drive.")
  const file = await response.blob()
  const extension = file.type === "video/webm" ? "webm" : "mp4"
  const name = `${record.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "destiverse-download"}.${extension}`
  const boundary = `destiverse-${crypto.randomUUID()}`
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, description: "Copied from DestiVerse Offline Watch" })}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`, file, `\r\n--${boundary}--`,
  ])
  const upload = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body,
  })
  const payload = await upload.json().catch(() => null)
  if (!upload.ok || !payload?.id) throw new Error(payload?.error?.message || "Google Drive could not save this download.")
  return payload as { id: string; name: string; webViewLink?: string }
}
