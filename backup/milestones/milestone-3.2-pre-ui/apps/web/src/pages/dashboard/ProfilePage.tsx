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
        <h1 className="text-2xl font-semibold">
          Profile
        </h1>

        <p className="mt-2 text-muted-foreground">
          Please sign in to view your profile.
        </p>
      </main>
    )
  }

  return (
    <main className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Profile
        </h1>

        <p className="mt-2 text-muted-foreground">
          Manage your DestiVerse Vision profile.
        </p>
      </div>

      <section className="rounded-xl border p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">
            Account
          </h2>

          <p className="text-sm text-muted-foreground">
            {session.user.email}
          </p>
        </div>

        {loading && (
          <p className="mt-6 text-sm text-muted-foreground">
            Loading profile...
          </p>
        )}

        {!loading && error && (
          <p
            className="mt-6 text-sm text-destructive"
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
                className="text-sm font-medium"
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
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                placeholder="Enter your display name"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save profile
            </button>

            {saveMessage && (
              <p
                className="text-sm text-green-600"
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
