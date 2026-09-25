import type { ReactNode } from "react"
import { Wrench } from "lucide-react"
import { useContent } from "@/contexts/ContentContext"

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const { settings } = useContent()
  if (settings.maintenance_enabled !== "true") return <>{children}</>
  return <main className="grid min-h-screen place-items-center bg-[var(--dv-background)] p-6 text-center text-white"><section className="max-w-md"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--dv-accent)]/15 text-[var(--dv-accent)]"><Wrench /></div><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[var(--dv-accent)]">DestiVerse Vision</p><h1 className="mt-3 text-3xl font-black">We’ll be right back</h1><p className="mt-4 text-sm leading-7 text-white/65">{settings.maintenance_message || "We are making improvements to DestiVerse Vision. Please check back shortly."}</p></section></main>
}
