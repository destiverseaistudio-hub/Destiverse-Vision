import { Outlet } from "react-router-dom"

import Header from "@/components/layout/Header"
import MobileBottomNav from "@/components/layout/MobileBottomNav"
import Sidebar from "@/components/layout/Sidebar"

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[var(--dv-background)] text-[var(--dv-foreground)]">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header />

          <main className="min-h-0 flex-1 overflow-y-auto pb-20 lg:pb-0">
            <div className="mx-auto w-full max-w-[var(--dv-content-max-width)] p-4 sm:p-6 lg:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  )
}
