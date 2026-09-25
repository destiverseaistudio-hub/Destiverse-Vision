import { act, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const hoisted = vi.hoisted(() => {
  return {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    unsubscribe: vi.fn(),
  }
})

const getSession = hoisted.getSession
const onAuthStateChange = hoisted.onAuthStateChange
const unsubscribe = hoisted.unsubscribe

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        getSession: hoisted.getSession,
        onAuthStateChange: hoisted.onAuthStateChange,
      },
    },
  }
})

import { AuthProvider, useAuth } from "./AuthContext"

type TestUser = { id: string }
type TestSession = { user: TestUser }
type AuthChangeHandler = (
  event: string,
  session: TestSession | null,
) => void

function Probe() {
  const auth = useAuth()

  const label = auth.session ? auth.session.user.id : "none"

  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="session">{label}</span>
    </div>
  )
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

let changeHandler: AuthChangeHandler | undefined

beforeEach(() => {
  getSession.mockReset()
  onAuthStateChange.mockReset()
  unsubscribe.mockReset()
  changeHandler = undefined

  onAuthStateChange.mockImplementation((handler: AuthChangeHandler) => {
    changeHandler = handler
    const subscription = { unsubscribe }
    return { data: { subscription } }
  })
})

describe("AuthProvider", () => {
  it("starts in a loading state with no session", () => {
    getSession.mockReturnValue(new Promise(() => {}))

    renderProvider()

    expect(screen.getByTestId("loading").textContent).toBe("true")
    expect(screen.getByTestId("session").textContent).toBe("none")
  })

  it("loads an existing session and clears loading", async () => {
    const session: TestSession = { user: { id: "user-1" } }

    getSession.mockResolvedValue({ data: { session } })

    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false")
    })

    expect(screen.getByTestId("session").textContent).toBe("user-1")
  })

  it("finishes loading with no session when none exists", async () => {
    getSession.mockResolvedValue({ data: { session: null } })

    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false")
    })

    expect(screen.getByTestId("session").textContent).toBe("none")
  })

  it("reacts to auth state change events", async () => {
    getSession.mockResolvedValue({ data: { session: null } })

    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false")
    })

    act(() => {
      changeHandler?.("SIGNED_IN", { user: { id: "user-2" } })
    })

    expect(screen.getByTestId("session").textContent).toBe("user-2")

    act(() => {
      changeHandler?.("SIGNED_OUT", null)
    })

    expect(screen.getByTestId("session").textContent).toBe("none")
  })

  it("unsubscribes from auth changes on unmount", async () => {
    getSession.mockResolvedValue({ data: { session: null } })

    const rendered = renderProvider()

    await waitFor(() => {
      expect(onAuthStateChange).toHaveBeenCalledTimes(1)
    })

    rendered.unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
