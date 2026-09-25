import { useNavigate } from "react-router-dom"
import {
  LogOut,
  Search,
  UserCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { signOut } from "@/services/auth"

export default function Header() {
  const { session } = useAuth()
  const navigate = useNavigate()

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

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[var(--dv-border)] bg-[color:var(--dv-background)]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="truncate text-lg font-bold tracking-tight text-[var(--dv-foreground)] transition-opacity hover:opacity-80 sm:text-xl"
          aria-label="Go to DestiVerse Vision home"
        >
          DestiVerse <span className="text-[var(--dv-accent)]">Vision</span>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
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


