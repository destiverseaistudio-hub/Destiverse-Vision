import { Bot, Coins, Send, X } from "lucide-react"
import { useState } from "react"

import { supabase } from "@/lib/supabase"

type Message = { role: "user" | "assistant"; text: string }

export default function ViewerAiAssistant() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Hi, I’m Vision Guide. I can help you find your way around DestiVerse, Reels, downloads, creator tools, and safety features." }])
  const [busy, setBusy] = useState(false)
  const [useCoinsIfNeeded, setUseCoinsIfNeeded] = useState(false)

  const ask = async () => {
    const message = question.trim()
    if (!message || busy) return
    setQuestion("")
    setMessages((current) => [...current, { role: "user", text: message }])
    setBusy(true)
    const { data, error } = await supabase.functions.invoke("viewer-ai-assistant", { body: { message, use_coins: useCoinsIfNeeded } })
    let functionError = typeof data?.error === "string" ? data.error : ""
    if (!functionError && error?.context instanceof Response) {
      try {
        const body = await error.context.clone().json()
        functionError = typeof body?.error === "string" ? body.error : ""
      } catch { /* The standard function error below remains useful. */ }
    }
    const responseText = typeof data?.reply === "string"
      ? data.reply
      : functionError
        ? functionError
        : error?.message
          ? `Vision Guide is unavailable: ${error.message}`
          : "I could not prepare a response. Please try again."
    setMessages((current) => [...current, { role: "assistant", text: responseText }])
    setBusy(false)
  }

  return <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[70] lg:bottom-6 lg:right-6">
    {open ? <section aria-label="Vision Guide AI helper" className="mb-3 flex h-[min(34rem,calc(100dvh-8rem))] w-[min(19rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#12111a] shadow-2xl shadow-black/60 sm:w-[min(22rem,calc(100vw-2rem))]">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-[var(--dv-accent)]"><Bot className="size-4 text-white" /></span><div><strong className="block text-sm text-white">Vision Guide</strong><span className="text-[10px] text-slate-400">AI help · 20 free replies daily</span></div></div><button type="button" aria-label="Close AI helper" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10"><X className="size-4" /></button></header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map((message, index) => <p key={`${message.role}-${index}`} className={`max-w-[92%] rounded-2xl px-3 py-2.5 text-sm leading-5 ${message.role === "user" ? "ml-auto bg-[var(--dv-accent)] text-white" : "bg-white/10 text-slate-200"}`}>{message.text}</p>)}{busy ? <p className="w-fit rounded-2xl bg-white/10 px-3 py-2 text-sm text-slate-300">Thinking...</p> : null}</div>
      <form onSubmit={(event) => { event.preventDefault(); void ask() }} className="border-t border-white/10 p-3"><label className="mb-2 flex items-center gap-2 text-[11px] text-slate-400"><input type="checkbox" checked={useCoinsIfNeeded} onChange={(event) => setUseCoinsIfNeeded(event.target.checked)} className="size-3.5 accent-[var(--dv-accent)]" /><Coins className="size-3.5 text-amber-300" />After free replies, use 2 Coins for this reply</label><div className="flex gap-2"><input value={question} maxLength={700} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about DestiVerse..." className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--dv-accent)]" /><button type="submit" disabled={!question.trim() || busy} aria-label="Send question" className="grid size-10 place-items-center rounded-xl bg-[var(--dv-accent)] text-white disabled:opacity-50"><Send className="size-4" /></button></div></form>
    </section> : null}
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-full bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-black/30" aria-expanded={open}><Bot className="size-5" /> <span className="hidden sm:inline">Ask Vision Guide</span></button>
  </div>
}
