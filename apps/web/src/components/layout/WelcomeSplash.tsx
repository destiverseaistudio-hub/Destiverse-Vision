import { useEffect, useState } from "react"

const splashSeenKey = "dv-welcome-splash-seen"

export default function WelcomeSplash({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(() => sessionStorage.getItem(splashSeenKey) !== "true")

  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(splashSeenKey, "true")
      setVisible(false)
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [visible])

  return <>
    {children}
    {visible ? <div className="fixed inset-0 z-[200] grid place-items-center bg-[#070708] px-6 text-center text-white" role="status" aria-label="Welcome to DestiVerse Vision"><div className="animate-in fade-in zoom-in-95 duration-500"><img src="/brand/destiverse-vision-logo.png" alt="DestiVerse Vision" className="mx-auto size-24 rounded-3xl object-contain shadow-2xl shadow-black/60 sm:size-28" /><p className="mt-6 text-xs font-bold uppercase tracking-[.28em] text-[var(--dv-accent)]">Welcome to</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">DestiVerse Vision</h1><p className="mt-3 text-sm text-white/60">Where imagination becomes reality.</p></div></div> : null}
  </>
}
