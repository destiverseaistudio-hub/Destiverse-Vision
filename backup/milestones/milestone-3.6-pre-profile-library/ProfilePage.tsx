import { useEffect, useState } from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useProfile } from "@/hooks/useProfile"

export default function ProfilePage() {
  const { session } = useAuth()

  const {
    profile,
    loading,
    error,
    updateProfile,
  } = useProfile()

  const [displayName, setDisplayName] = useState("")
  const [saveMessage, setSaveMessage] = useState("")

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "")
  }, [profile])

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setSaveMessage("")

    const result = await updateProfile({
      display_name: displayName.trim() || null,
      avatar_url: profile?.avatar_url ?? null,
    })

    if (result.success) {
      setSaveMessage("Profile updated successfully.")
    }
  }

  if (!session?.user) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold text-[var(--dv-foreground)]">
          Profile
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Please sign in to view your profile.
        </p>
      </main>
    )
  }

  return (
    <main className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--dv-foreground)]">
          Profile
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Manage your DestiVerse Vision profile.
        </p>
      </div>

      <section className="dv-surface rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] p-6 shadow-[var(--dv-shadow-card)]">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-[var(--dv-foreground)]">
            Account
          </h2>

          <p className="text-sm text-slate-400">
            {session.user.email}
          </p>
        </div>

        {loading && (
          <p className="mt-6 text-sm text-slate-400">
            Loading profile...
          </p>
        )}

        {!loading && error && (
          <p
            className="mt-6 text-sm text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}

        {!loading && !error && (
          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-5"
          >
            <div className="space-y-2">
              <label
                htmlFor="display-name"
                className="text-sm font-medium text-[var(--dv-foreground)]"
              >
                Display name
              </label>

              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(event) =>
                  setDisplayName(event.target.value)
                }
                maxLength={80}
                autoComplete="name"
                className="w-full rounded-md border border-[var(--dv-border)] bg-[var(--dv-background)] px-3 py-2 text-sm text-[var(--dv-foreground)] outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-[var(--dv-accent)]"
                placeholder="Enter your display name"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-[var(--dv-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save profile
            </button>

            {saveMessage && (
              <p
                className="text-sm text-green-400"
                role="status"
                aria-live="polite"
              >
                {saveMessage}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  )
}
