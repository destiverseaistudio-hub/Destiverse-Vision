const cacheName = "destiverse-offline-v1"
const recordsKey = "destiverse-offline-records"

export type OfflineRecord = { id: string; title: string; source: string; savedAt: string; bytes: number }

function readRecords(): OfflineRecord[] {
  try { const data = JSON.parse(localStorage.getItem(recordsKey) ?? "[]"); return Array.isArray(data) ? data : [] } catch { return [] }
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

export async function downloadForOffline(item: { id: string; title: string; source: string }) {
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
  writeRecords([{ id: item.id, title: item.title, source: item.source, savedAt: new Date().toISOString(), bytes }, ...records])
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

export async function getOfflineVideoUrl(record: OfflineRecord) {
  const response = await (await caches.open(cacheName)).match(record.source)
  if (!response) throw new Error("This offline file is no longer available on this device.")
  return URL.createObjectURL(await response.blob())
}
