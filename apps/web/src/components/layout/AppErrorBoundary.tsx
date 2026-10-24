import { Component, type ErrorInfo, type ReactNode } from "react"
import { Link } from "react-router-dom"

type Props = { children: ReactNode }
type State = { failed: boolean }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled DestiVerse application error", error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return <main className="grid min-h-screen place-items-center bg-[var(--dv-background)] p-5 text-center text-white">
      <section className="max-w-md rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-7 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">DestiVerse Vision</p>
        <h1 className="mt-3 text-2xl font-black">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Refresh the app to try again. If this continues, contact support with what you were doing when it happened.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white">Refresh app</button>
          <Link to="/help" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white">Get help</Link>
        </div>
      </section>
    </main>
  }
}
