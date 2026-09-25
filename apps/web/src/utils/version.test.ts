import { describe, expect, it } from "vitest"

import { compareVersions, isVersionAtLeast } from "./version"

describe("version utilities", () => {
  it("compares semantic versions correctly", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0)
    expect(compareVersions("1.0.1", "1.0.0")).toBe(1)
    expect(compareVersions("1.0.0", "1.0.1")).toBe(-1)
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1)
  })

  it("checks whether the app meets the required minimum version", () => {
    expect(isVersionAtLeast("1.3.2", "1.3.2")).toBe(true)
    expect(isVersionAtLeast("1.3.2", "1.3.1")).toBe(true)
    expect(isVersionAtLeast("1.3.2", "1.4.0")).toBe(false)
  })
})
