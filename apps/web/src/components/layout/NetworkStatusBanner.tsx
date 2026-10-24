import { useEffect, useState } from "react"

export default function NetworkStatusBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  if (online) return null
  return <p role="status" className="bg-amber-300 px-4 py-2 text-center text-xs font-bold text-zinc-950">You are offline. Previously saved content may still be available, but changes will not sync until you reconnect.</p>
}
