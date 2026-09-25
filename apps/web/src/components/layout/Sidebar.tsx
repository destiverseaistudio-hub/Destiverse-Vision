import {
  Home,
  Library,
  ListVideo,
  Search,
  Settings,
  UserCircle,
  Tags,
  Sparkles,
  Bell,
  HardDriveDownload,
  Crown,
  UsersRound,
} from "lucide-react"
import { NavLink } from "react-router-dom"

const items = [
  {
    label: "Reels",
    to: "/dashboard/reels",
    icon: Sparkles,
  },
  {
    label: "Home",
    to: "/dashboard",
    icon: Home,
  },
  {
    label: "Categories",
    to: "/dashboard/categories",
    icon: Tags,
  },
  {
    label: "Search",
    to: "/dashboard/search",
    icon: Search,
  },
  {
    label: "Watchlist",
    to: "/dashboard/watchlist",
    icon: ListVideo,
  },
  {
    label: "Library",
    to: "/dashboard/library",
    icon: Library,
  },
  {
    label: "Offline Watch",
    to: "/dashboard/offline",
    icon: HardDriveDownload,
  },
  {
    label: "Premium & Coins",
    to: "/dashboard/membership",
    icon: Crown,
  },
  {
    label: "Profile",
    to: "/dashboard/profile",
    icon: UserCircle,
  },
  {
    label: "Creator Studio",
    to: "/dashboard/creator-studio",
    icon: Sparkles,
  },
  {
    label: "Film Studio",
    to: "/dashboard/creator-film-studio",
    icon: Library,
  },
  {
    label: "Discover creators",
    to: "/dashboard/creators",
    icon: UsersRound,
  },
  {
    label: "Notifications",
    to: "/dashboard/notifications",
    icon: Bell,
  },
  {
    label: "Settings",
    to: "/dashboard/settings",
    icon: Settings,
  },
]

export default function Sidebar() {
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--dv-border)] bg-[var(--dv-surface)] lg:flex">
      <div className="flex h-20 shrink-0 items-center border-b border-[var(--dv-border)] px-6">
        <button
          type="button"
          className="flex items-center gap-3"
          aria-label="DestiVerse Vision"
        >
          <img src="/brand/destiverse-vision-logo.png" alt="" className="size-10 rounded-xl object-cover shadow-[var(--dv-shadow-accent)]" />

          <span className="text-lg font-bold tracking-tight text-[var(--dv-foreground)]">
            DestiVerse
            <span className="text-[var(--dv-accent)]"> Vision</span>
          </span>
        </button>
      </div>

      <nav
        aria-label="Primary navigation"
        className="flex-1 overflow-y-auto px-3 py-6"
      >
        <p className="px-3 pb-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--dv-muted-foreground)]">
          Browse
        </p>

        <div className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dashboard"}
                className={({ isActive }: { isActive: boolean }) =>
                  [
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dv-accent)]",
                    isActive
                      ? "bg-[var(--dv-accent-soft)] text-[var(--dv-accent)]"
                      : "text-[var(--dv-muted-foreground)] hover:bg-[var(--dv-surface-hover)] hover:text-[var(--dv-foreground)]",
                  ].join(" ")
                }
              >
                <Icon className="size-[18px] shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-[var(--dv-border)] px-6 py-5">
        <p className="text-xs leading-5 text-[var(--dv-muted-foreground)]">
          Where Imagination Becomes Reality.
        </p>
      </div>
    </aside>
  )
}

