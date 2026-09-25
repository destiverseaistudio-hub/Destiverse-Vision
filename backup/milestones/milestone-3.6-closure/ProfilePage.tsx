import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Mail, Pencil, UserCircle2 } from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { useProfile } from "@/hooks/useProfile"

function getInitials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "DV"
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

function formatMemberSince(value: string | null | undefined) {
  if (!value) {
    return "Member"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Member"
  }

  return `Member since ${date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })}`
}

export default function ProfilePage() {
  const { session } = useAuth()

  const {
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile,
  } = useProfile()

  const [displayName, setDisplayName] = useState("")
  const [saveMessage, setSaveMessage] = useState("")

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "")
  }, [profile])

  const initials = useMemo(
    () => getInitials(displayName, session?.user?.email ?? ""),
    [displayName, session?.user?.email],
  )

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
      <main className="max-w-2xl">
        <section className="dv-surface rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] p-6 shadow-[var(--dv-shadow-card)] sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--dv-foreground)]">
            Profile
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Please sign in to view your profile.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="space-y-6 pb-4">
      <section className="relative overflow-hidden rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] bg-[var(--dv-surface)] shadow-[var(--dv-shadow-card)]">
        <div
          className="absolute inset-0 dv-art-river opacity-15"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/60"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:px-8 sm:py-10">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--dv-accent)]/60 bg-[var(--dv-surface-elevated)] text-2xl font-bold text-[var(--dv-foreground)] shadow-lg">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dv-accent)]">
              DestiVerse Vision
            </p>

            <h1 className="mt-2 truncate text-3xl font-bold tracking-tight text-[var(--dv-foreground)] sm:text-4xl">
              {profile?.display_name || "Your Profile"}
            </h1>

            <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{session.user.email}</span>
            </p>

            <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <CalendarDays className="h-4 w-4 shrink-0" />
              {formatMemberSince(profile?.created_at)}
            </p>
          </div>
        </div>
      </section>

      <section className="dv-surface rounded-[var(--dv-radius-card)] border border-[var(--dv-border)] p-6 shadow-[var(--dv-shadow-card)] sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--dv-accent)]/10 text-[var(--dv-accent)]">
            <Pencil className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--dv-foreground)]">
              Profile details
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Keep your DestiVerse Vision profile up to date.
            </p>
          </div>
        </div>

        {loading && !profile && (
          <div className="mt-6 rounded-xl border border-[var(--dv-border)] bg-[var(--dv-background)] p-4">
            <p className="text-sm text-slate-400">
              Loading profile...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void refreshProfile()}
              className="mt-4 rounded-md border border-[var(--dv-border)] px-4 py-2 text-sm font-medium text-[var(--dv-foreground)] transition hover:bg-[var(--dv-surface-elevated)]"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && profile && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="display-name"
                className="text-sm font-medium text-[var(--dv-foreground)]"
              >
                Display name
              </label>

              <div className="relative">
                <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value)
                    setSaveMessage("")
                  }}
                  maxLength={80}
                  autoComplete="name"
                  className="w-full rounded-xl border border-[var(--dv-border)] bg-[var(--dv-background)] py-3 pl-10 pr-3 text-sm text-[var(--dv-foreground)] outline-none placeholder:text-slate-500 focus:border-[var(--dv-accent)] focus:ring-2 focus:ring-[var(--dv-accent)]/30"
                  placeholder="Enter your display name"
                />
              </div>

              <p className="text-xs text-slate-500">
                Up to 80 characters.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--dv-border)] bg-[var(--dv-background)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Account email
              </p>
              <p className="mt-2 break-all text-sm text-[var(--dv-foreground)]">
                {session.user.email}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Your sign-in email is managed by your account.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[var(--dv-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save profile"}
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
            </div>
          </form>
        )}
      </section>
    </main>
  )
}
