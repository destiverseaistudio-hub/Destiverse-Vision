import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { supabase } from "@/lib/supabase"

export default function PaymentReturnPage() {
  const [params] = useSearchParams()
  const reference = params.get("reference")
  const [state, setState] = useState<"loading" | "success" | "pending" | "error">(() => reference ? "loading" : "error")
  const [message, setMessage] = useState(() => reference ? "Confirming your payment securely with Paystack..." : "No payment reference was provided.")
  useEffect(() => {
    if (!reference) return
    let active = true
    void supabase.functions.invoke("verify-paystack-payment", { body: { reference } }).then(({ data, error }) => {
      if (!active) return
      if (error) { setState("error"); setMessage("We could not confirm this payment yet. If you completed it, refresh this page shortly."); return }
      if (data?.paid) { setState("success"); setMessage(data.message || "Payment confirmed.") }
      else { setState("pending"); setMessage(data?.message || "Payment is still awaiting confirmation.") }
    })
    return () => { active = false }
  }, [reference])
  const icon = state === "loading" ? <LoaderCircle className="size-10 animate-spin text-[var(--dv-accent)]" /> : state === "success" ? <CheckCircle2 className="size-10 text-emerald-400" /> : <XCircle className="size-10 text-amber-300" />
  return <main className="mx-auto grid min-h-[60dvh] max-w-lg place-items-center pb-10"><section className="w-full rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-8 text-center">{icon}<h1 className="mt-5 text-2xl font-black text-white">{state === "success" ? "Payment confirmed" : state === "loading" ? "Confirming payment" : "Payment needs attention"}</h1><p className="mt-3 text-sm leading-6 text-slate-400">{message}</p><Link to="/dashboard/membership" className="mt-7 inline-flex rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white">Back to Premium & Coins</Link></section></main>
}
