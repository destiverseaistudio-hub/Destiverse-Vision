import { Mail, MessageCircle, Phone, Send } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { ContentProvider, useContent } from "@/contexts/ContentContext"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

function HelpContent() {
  const { settings } = useContent()
  const { session } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [formNotice, setFormNotice] = useState("")
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [tickets, setTickets] = useState<Array<{ id: string; subject: string; message: string; status: string; admin_reply: string; replied_at: string | null; created_at: string }>>([])
  useEffect(() => { if (!session?.user.id) return; void supabase.from("support_tickets").select("id,subject,message,status,admin_reply,replied_at,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).then(({ data }) => setTickets((data ?? []) as typeof tickets)) }, [session?.user.id])

  const whatsappSource = settings.support_whatsapp_url?.trim() || settings.support_phone?.trim() || ""
  const whatsappBase = /^https?:\/\//i.test(whatsappSource)
    ? whatsappSource
    : whatsappSource.replace(/\D/g, "")
      ? `https://wa.me/${whatsappSource.replace(/\D/g, "")}`
      : ""
  const hasContact = Boolean(settings.support_email || settings.support_phone || whatsappBase || settings.contact_cta_url)
  const supportText = `Name: ${name || "Not provided"}\nEmail: ${email || "Not provided"}\n\nMessage:\n${message || "Hello DestiVerse Vision support,"}`
  const emailUrl = settings.support_email
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(settings.support_email)}&su=${encodeURIComponent("DestiVerse Vision support request")}&body=${encodeURIComponent(supportText)}`
    : ""
  const whatsappUrl = whatsappBase
    ? `${whatsappBase}${whatsappBase.includes("?") ? "&" : "?"}text=${encodeURIComponent(supportText)}`
      : ""

  async function submitTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session?.user) {
      setFormError("Sign in to send a support ticket, or use the contact options below.")
      return
    }
    setSubmitting(true)
    setFormError("")
    const { error } = await supabase.from("support_tickets").insert({
      user_id: session.user.id,
      subject: "Viewer help request",
      message: message.trim(),
      contact_email: email.trim() || session.user.email || null,
      admin_note: name.trim() ? `Name supplied: ${name.trim()}` : "",
    })
    setSubmitting(false)
    if (error) { setFormError("We couldn't send your request. Please try again or use the contact options below."); return }
    setMessage("")
    setFormNotice("Your support request has been sent.")
  }

  return (
    <main className="min-h-screen bg-[var(--dv-background)] px-4 py-10 text-white sm:px-6">
      <section className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm text-white/60 hover:text-white">← Back to DestiVerse Vision</Link>
        <p className="mt-10 text-xs font-bold uppercase tracking-[.2em] text-[var(--dv-accent)]">Help center</p>
        <h1 className="mt-3 text-4xl font-black">How can we help?</h1>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-white/70">
          {settings.help_center || "Find support, contact our team, and stay up to date with DestiVerse Vision."}
        </p>

        {hasContact ? (
          <>
            <form className="mt-10 grid gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:p-6" onSubmit={submitTicket}>
              <h2 className="text-xl font-bold">Send us a message</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">Name<input className="rounded-lg border border-white/15 bg-black/20 px-3 py-2.5 text-white" value={name} onChange={(event) => setName(event.target.value)} /></label>
                <label className="grid gap-2 text-sm">Your email<input type="email" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2.5 text-white" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              </div>
              <label className="grid gap-2 text-sm">Message<textarea required rows={5} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2.5 text-white" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us how we can help" /></label>
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold disabled:opacity-60"><Send className="size-4" /> {submitting ? "Sending..." : "Send support request"}</button>
                {emailUrl ? <a className="inline-flex items-center gap-2 rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold" href={emailUrl} target="_blank" rel="noreferrer"><Mail className="size-4" /> Open Gmail</a> : null}
                {whatsappUrl ? <a className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-4 py-3 text-sm font-bold" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> WhatsApp</a> : null}
              </div>
              {formNotice ? <p className="text-sm text-green-300" role="status">{formNotice}</p> : null}
              {formError ? <p className="text-sm text-red-300" role="alert">{formError}</p> : null}
            </form>
            {session ? <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:p-6"><h2 className="text-xl font-bold">My support requests</h2><div className="mt-4 space-y-3">{tickets.length ? tickets.map((ticket) => <article key={ticket.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-white">{ticket.subject}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${ticket.status === "resolved" ? "bg-emerald-500/20 text-emerald-200" : ticket.status === "in_progress" ? "bg-amber-500/20 text-amber-200" : "bg-white/10 text-white/70"}`}>{ticket.status.replace("_", " ")}</span></div><p className="mt-2 text-sm text-white/70">{ticket.message}</p><time className="mt-2 block text-xs text-white/40">Sent {new Date(ticket.created_at).toLocaleString()}</time>{ticket.admin_reply ? <div className="mt-3 rounded-lg border border-[var(--dv-accent)]/25 bg-[var(--dv-accent)]/10 p-3"><strong className="text-xs text-white">DestiVerse reply</strong><p className="mt-1 text-sm text-white/80">{ticket.admin_reply}</p>{ticket.replied_at ? <time className="mt-1 block text-xs text-white/45">{new Date(ticket.replied_at).toLocaleString()}</time> : null}</div> : null}</article>) : <p className="text-sm text-white/50">You have not sent any support requests.</p>}</div></section> : null}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {settings.support_phone ? <a className="rounded-2xl border border-white/10 bg-white/[.04] p-5" href={`tel:${settings.support_phone}`}><Phone className="size-5 text-[var(--dv-accent)]" /><strong className="mt-4 block">Call support</strong><span className="mt-1 block text-sm text-white/60">{settings.support_phone}</span></a> : null}
              {settings.contact_cta_url ? <a className="rounded-2xl border border-white/10 bg-white/[.04] p-5" href={settings.contact_cta_url} target="_blank" rel="noreferrer"><Send className="size-5 text-[var(--dv-accent)]" /><strong className="mt-4 block">{settings.contact_cta_label || "Contact support"}</strong></a> : null}
            </div>
          </>
        ) : <p className="mt-10 rounded-2xl border border-white/10 bg-white/[.04] p-6 text-sm text-white/60">Support contact details will be available soon.</p>}
      </section>
    </main>
  )
}

export default function HelpPage() {
  return <ContentProvider><HelpContent /></ContentProvider>
}
