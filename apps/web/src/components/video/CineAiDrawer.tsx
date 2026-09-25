import { Bot, Sparkles, X, BookOpen, Film, Compass, Send } from "lucide-react"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import type { ContentItem, Episode } from "@/data/content"

type CineAiDrawerProps = {
  content: ContentItem
  currentEpisode?: Episode
  isOpen: boolean
  onClose: () => void
}

type Message = { role: "user" | "assistant"; text: string }

export default function CineAiDrawer({
  content,
  currentEpisode,
  isOpen,
  onClose,
}: CineAiDrawerProps) {
  const [activeTab, setActiveTab] = useState<"lore" | "characters" | "ask">("lore")
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `Greetings! I am CineAI, your dedicated scene and story world companion for "${content.title}". Ask me about the cultural mythology, symbols, character motivations, or behind-the-scenes filmmaking details.`,
    },
  ])
  const [busy, setBusy] = useState(false)

  if (!isOpen) return null

  const titleContext = currentEpisode
    ? `${content.title} - Season ${currentEpisode.seasonNumber}, Episode ${currentEpisode.episodeNumber}: "${currentEpisode.title}"`
    : content.title

  const askCineAi = async () => {
    const query = question.trim()
    if (!query || busy) return
    setQuestion("")
    setMessages((prev) => [...prev, { role: "user", text: query }])
    setBusy(true)

    const promptContext = `You are DestiVerse CineAI, a passionate and insightful film scholar and cultural curator for African cinema and visual storytelling. The user is currently watching: ${titleContext}. Category: ${content.category}, Type: ${content.type}. Synopsis: ${content.description}. Provide deep, culturally respectful, evocative answers explaining mythology, character psychology, and cinematic context. User question: ${query}`

    try {
      const { data, error } = await supabase.functions.invoke("viewer-ai-assistant", {
        body: { message: promptContext, use_coins: false },
      })
      const reply = data?.reply || error?.message || "CineAI is reflecting on this scene. Please ask again shortly."
      setMessages((prev) => [...prev, { role: "assistant", text: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "The spirits of the story world whisper that this title bridges ancient folklore with futuristic African imagination. What else would you like to discover?",
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside
      aria-label="CineAI Scene Guide"
      className="absolute inset-y-0 right-0 z-50 flex w-full max-w-sm sm:max-w-md flex-col border-l border-white/10 bg-[#0c0a14]/95 backdrop-blur-2xl shadow-2xl transition-all duration-300"
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-amber-500 via-[var(--dv-accent)] to-fuchsia-600 text-white shadow-lg shadow-purple-900/40">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-white">CineAI Story Companion</h2>
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-[240px]">
              {titleContext}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Close CineAI drawer"
        >
          <X className="size-4" />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4 pt-2 text-xs font-semibold text-slate-400">
        <button
          type="button"
          onClick={() => setActiveTab("lore")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 transition ${
            activeTab === "lore"
              ? "border-[var(--dv-accent)] text-white"
              : "border-transparent hover:text-slate-200"
          }`}
        >
          <Compass className="size-3.5" />
          Story Lore
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("characters")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 transition ${
            activeTab === "characters"
              ? "border-[var(--dv-accent)] text-white"
              : "border-transparent hover:text-slate-200"
          }`}
        >
          <BookOpen className="size-3.5" />
          Themes & Cast
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ask")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 transition ${
            activeTab === "ask"
              ? "border-[var(--dv-accent)] text-white"
              : "border-transparent hover:text-slate-200"
          }`}
        >
          <Bot className="size-3.5" />
          Ask CineAI
        </button>
      </div>

      {/* Content Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-300 text-sm [scrollbar-width:thin]">
        {activeTab === "lore" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--dv-accent)]">
                Mythology & Cultural Context
              </span>
              <h3 className="mt-1 font-bold text-white text-base">The River Covenant & Ancestral Memory</h3>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                In classical West African river mythology, waterways are living archives of ancestral memory. When a character is summoned to the water, they are entering a liminal space between human law and divine destiny.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                Cinematic Visual Motifs
              </span>
              <ul className="mt-2 space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Film className="size-3.5 mt-0.5 text-amber-400 shrink-0" />
                  <span><strong>Color Palette:</strong> Deep indigo and ochre symbolize royal heritage and the threshold between mortality and spiritual awakening.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Film className="size-3.5 mt-0.5 text-amber-400 shrink-0" />
                  <span><strong>Audio Design:</strong> Ambient water harmonies incorporate traditional talking drums tuned to heartbeat cadences.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "characters" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <strong className="block text-white font-bold">Kalu (The Chosen Vanguard)</strong>
              <p className="mt-1 text-xs text-slate-400">
                Torn between modern skepticism and ancient bloodline rites, Kalu represents the dual identity of the contemporary African protagonist.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <strong className="block text-white font-bold">The Matriarch of the Shrines</strong>
              <p className="mt-1 text-xs text-slate-400">
                Keeper of the sacred cowries and ancestral songs. She serves as the bridge between past warnings and future crises.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <strong className="block text-white font-bold">Core Theme: Heritage vs. Modernity</strong>
              <p className="mt-1 text-xs text-slate-400">
                How an ancient people preserve their sovereignty and spiritual balance amidst changing global tides.
              </p>
            </div>
          </div>
        )}

        {activeTab === "ask" && (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-3 text-xs leading-5 max-w-[88%] ${
                    m.role === "user"
                      ? "ml-auto bg-[var(--dv-accent)] text-white"
                      : "bg-white/[0.08] text-slate-200"
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {busy && (
                <div className="w-fit rounded-2xl bg-white/10 px-3 py-2 text-xs text-slate-400 animate-pulse">
                  CineAI is analyzing the scene...
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                void askCineAi()
              }}
              className="mt-4 flex gap-2 border-t border-white/10 pt-3"
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about this scene or story..."
                maxLength={400}
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[var(--dv-accent)]"
              />
              <button
                type="submit"
                disabled={!question.trim() || busy}
                aria-label="Send query"
                className="grid size-9 place-items-center rounded-xl bg-[var(--dv-accent)] text-white disabled:opacity-40"
              >
                <Send className="size-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  )
}
