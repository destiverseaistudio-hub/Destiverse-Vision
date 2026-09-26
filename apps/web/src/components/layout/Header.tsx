import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Bell,
  LogOut,
  RefreshCw,
  Search,
  UserCircle,
} from "lucide-react"
import { useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { signOut } from "@/services/auth"

export default function Header() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await signOut()
    navigate("/", { replace: true })
  }

  function handleSearch() {
    navigate("/dashboard/search")
  }

  function handleProfile() {
    navigate("/dashboard/profile")
  }

  function handleNotifications() {
    navigate("/dashboard/notifications")
  }

  function handleRefresh() {
    window.sessionStorage.setItem("dv-refresh-path", `${location.pathname}${location.search}${location.hash}`)
    window.location.reload()
  }

  function handleBack() {
    if (location.pathname === "/dashboard") return

    const current = `${location.pathname}${location.search}${location.hash}`
    const raw = window.sessionStorage.getItem("dv-nav-history")
    const stack = raw ? JSON.parse(raw) as string[] : []
    const compact = [...new Set([...(stack || []), current])].filter(Boolean)
    const limited = compact.slice(-4)
    const previous = limited.length > 1 ? limited[limited.length - 2] : null

    window.sessionStorage.setItem("dv-nav-history", JSON.stringify(limited))

    if (previous && previous !== current) {
      navigate(previous, { replace: true })
      return
    }

    navigate("/dashboard", { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full min-w-0 shrink-0 items-center justify-between border-b border-[var(--dv-border)] bg-[color:var(--dv-background)]/95 px-3 backdrop-blur-xl sm:h-16 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        {location.pathname !== "/dashboard" ? <Button type="button" variant="ghost" size="sm" onClick={handleBack} className="shrink-0 text-[var(--dv-muted-foreground)] hover:bg-[var(--dv-surface-hover)] hover:text-[var(--dv-foreground)]" aria-label="Go back" title="Back"><ArrowLeft className="size-5" /></Button> : null}
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex min-w-0 items-center gap-2 truncate text-base font-bold tracking-tight text-[var(--dv-foreground)] transition-opacity hover:opacity-80 sm:text-xl"
          aria-label="Go to DestiVerse Vision home"
        >
          <img src="/brand/destiverse-vision-logo.png" alt="" className="size-8 shrink-0 rounded-lg object-cover sm:size-9" />
          <span className="hidden truncate sm:inline">DestiVerse <span className="text-[var(--dv-accent)]">Vision</span></span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={handleNotifications} className="text-[var(--dv-muted-foreground)] hover:bg-[var(--dv-surface-hover)] hover:text-[var(--dv-foreground)]" aria-label="Open notifications" title="Notifications">
          <Bell className="size-5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleRefresh} className="text-[var(--dv-muted-foreground)] hover:bg-[var(--dv-surface-hover)] hover:text-[var(--dv-foreground)]" aria-label="Refresh DestiVerse Vision" title="Refresh app">
          <RefreshCw className="size-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSearch}
          className="text-[var(--dv-muted-foreground)] hover:bg-[var(--dv-surface-hover)] hover:text-[var(--dv-foreground)]"
          aria-label="Search movies and series"
        >
          <Search className="size-5" />
        </Button>

        <button
          type="button"
          onClick={handleProfile}
          className="hidden min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--dv-surface-hover)] sm:flex"
          aria-label="Open profile"
        >
          <UserCircle className="size-6 shrink-0 text-[var(--dv-muted-foreground)]" />

          <span className="max-w-48 truncate text-sm text-[var(--dv-muted-foreground)]">
            {session?.user.email ?? "Account"}
          </span>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-[var(--dv-muted-foreground)] hover:bg-[var(--dv-surface-hover)] hover:text-[var(--dv-foreground)]"
          aria-label="Log out"
        >
          <LogOut className="size-5" />
        </Button>
      </div>
    </header>
  )
}



