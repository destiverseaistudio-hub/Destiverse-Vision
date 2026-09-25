import { NavLink } from "react-router-dom"

const items = [
  { label: "Home", to: "/dashboard" },
  { label: "Categories", to: "/dashboard/categories" },
  { label: "Search", to: "/dashboard/search" },
  { label: "Watchlist", to: "/dashboard/watchlist" },
  { label: "Library", to: "/dashboard/library" },
  { label: "Profile", to: "/dashboard/profile" },
  { label: "Settings", to: "/dashboard/settings" },
]

export default function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r bg-white p-6">
      <h2 className="mb-8 text-2xl font-bold">
        DestiVerse Vision
      </h2>

      <nav className="space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            className={({ isActive }: { isActive: boolean }) =>
              `block rounded-md px-4 py-2 transition-colors ${
                isActive
                  ? "bg-slate-200 font-semibold"
                  : "hover:bg-slate-100"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
