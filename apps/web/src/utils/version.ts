export function normalizeVersion(value: string | null | undefined): string {
  const raw = (value ?? "").trim()
  if (!raw) return "0.0.0"

  const match = raw.match(/\d+(?:\.\d+)*/)
  if (!match) return "0.0.0"

  return match[0]
}

export function compareVersions(left: string | null | undefined, right: string | null | undefined): number {
  const a = normalizeVersion(left).split(".").map(Number)
  const b = normalizeVersion(right).split(".").map(Number)

  const maxLength = Math.max(a.length, b.length)

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = a[index] ?? 0
    const rightPart = b[index] ?? 0

    if (leftPart > rightPart) return 1
    if (leftPart < rightPart) return -1
  }

  return 0
}

export function isVersionAtLeast(currentVersion: string | null | undefined, minimumVersion: string | null | undefined): boolean {
  return compareVersions(currentVersion, minimumVersion) >= 0
}
