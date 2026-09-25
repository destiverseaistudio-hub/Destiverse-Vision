import { NavLink } from "react-router-dom"
import {
  Film,
  Home,
  Library,
  ListVideo,
  Search,
  UserCircle,
  Bell,
  Crown,
  HardDriveDownload,
  Settings,
  Sparkles,
  UsersRound,
} from "lucide-react"

const items = [
  {
    label: "Home",
    to: "/dashboard",
    icon: Home,
  },
  {
    label: "Reels",
    to: "/dashboard/reels",
    icon: Film,
  },
  {
    label: "Categories",
    to: "/dashboard/categories",
    icon: Film,
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
    label: "Offline",
    to: "/dashboard/offline",
    icon: HardDriveDownload,
  },
  {
    label: "Premium",
    to: "/dashboard/membership",
    icon: Crown,
  },
  {
    label: "Profile",
    to: "/dashboard/profile",
    icon: UserCircle,
  },
  {
    label: "Creator",
    to: "/dashboard/creator-studio",
    icon: Sparkles,
  },
  {
    label: "Creators",
    to: "/dashboard/creators",
    icon: UsersRound,
  },
  {
    label: "Alerts",
    to: "/dashboard/notifications",
    icon: Bell,
  },
  {
    label: "Settings",
    to: "/dashboard/settings",
    icon: Settings,
  },
]

export default function MobileBottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--dv-border)] bg-[var(--dv-surface)]/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex min-h-15 max-w-full items-stretch overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:min-h-16">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              aria-label={item.label}
              className={({ isActive }: { isActive: boolean }) =>
                `flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[9px] font-medium transition-colors sm:w-[5rem] sm:px-0.5 sm:py-2 sm:text-[10px] ${
                  isActive
                    ? "text-[var(--dv-accent)]"
                    : "text-slate-400 hover:text-[var(--dv-foreground)]"
                }`
              }
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <span
                    className={`flex h-7 w-8 items-center justify-center rounded-xl transition-colors sm:h-8 sm:w-10 ${
                      isActive
                        ? "bg-[var(--dv-accent)]/10"
                        : ""
                    }`}
                  >
                    <Icon
                      className="h-4 w-4 sm:h-5 sm:w-5"
                      strokeWidth={isActive ? 2.4 : 2}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="max-w-full truncate leading-4">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
