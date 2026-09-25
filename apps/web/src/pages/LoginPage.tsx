import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useAuth } from "@/contexts/AuthContext"
import { useLogin } from "@/hooks/useLogin"
import { loginSchema, type LoginFormData } from "@/schemas/auth"
import { signInWithGoogle } from "@/services/auth"

export default function LoginPage() {
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()
  const { login, loading, serverError } = useLogin()
  const [googleLoading, setGoogleLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  useEffect(() => { if (!authLoading && session) navigate("/dashboard", { replace: true }) }, [session, authLoading, navigate])
  async function onSubmit(data: LoginFormData) { const result = await login({ email: data.email.trim().toLowerCase(), password: data.password }); if (result.success) navigate("/dashboard", { replace: true }) }
  async function googleLogin() { setGoogleLoading(true); const { error } = await signInWithGoogle(); if (error) setGoogleLoading(false) }

  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,_rgba(229,9,20,.25),_transparent_35rem),#070708] p-4 sm:p-6"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111113]/95 p-6 text-white shadow-2xl shadow-black/50 backdrop-blur sm:p-9"><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--dv-accent)]">DestiVerse Vision</p><h1 className="mt-3 text-3xl font-black tracking-tight">Welcome back</h1><p className="mt-2 text-sm leading-6 text-slate-400">Sign in to keep watching, save titles, and discover new stories.</p><button type="button" onClick={() => void googleLogin()} disabled={googleLoading || loading} className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[.06] px-4 py-3 text-sm font-semibold transition hover:bg-white/[.1] disabled:opacity-60"><span className="grid size-5 place-items-center rounded-full bg-white text-xs font-black text-black">G</span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</button><div className="my-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-white/10" />or use email<span className="h-px flex-1 bg-white/10" /></div><form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate><label className="grid gap-2 text-sm font-semibold">Email<input type="email" autoComplete="email" placeholder="you@example.com" className="rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-white outline-none focus:border-[var(--dv-accent)]" {...register("email")} /></label>{errors.email ? <p className="text-sm text-red-300">{errors.email.message}</p> : null}<label className="grid gap-2 text-sm font-semibold">Password<input type="password" autoComplete="current-password" placeholder="••••••••" className="rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-white outline-none focus:border-[var(--dv-accent)]" {...register("password")} /></label>{errors.password ? <p className="text-sm text-red-300">{errors.password.message}</p> : null}<div className="text-right"><Link to="/forgot-password" className="text-sm text-slate-300 underline hover:text-white">Forgot password?</Link></div>{serverError ? <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{serverError}</p> : null}<button type="submit" disabled={loading || authLoading} className="w-full rounded-xl bg-[var(--dv-accent)] px-4 py-3 font-bold transition hover:opacity-90 disabled:opacity-60">{loading ? "Signing in..." : "Sign in"}</button></form><p className="mt-6 text-center text-sm text-slate-400">New to DestiVerse? <Link to="/signup" className="font-semibold text-white underline">Create an account</Link></p></section></main>
}
