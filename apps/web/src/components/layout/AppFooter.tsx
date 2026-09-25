import { Link } from "react-router-dom"

export default function AppFooter() {
  return <footer className="mt-auto border-t border-white/10 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-6 text-xs text-white/45 sm:px-6 lg:px-8 lg:py-6"><div className="mx-auto flex max-w-[var(--dv-content-max-width)] flex-wrap items-center justify-between gap-3"><span>© {new Date().getFullYear()} DestiVerse Vision</span><nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Information"><Link className="hover:text-white" to="/help">Help & contact</Link><Link className="hover:text-white" to="/about">About</Link><Link className="hover:text-white" to="/privacy">Privacy</Link><Link className="hover:text-white" to="/terms">Terms</Link></nav></div></footer>
}
