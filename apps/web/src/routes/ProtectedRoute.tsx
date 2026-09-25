import type React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

type ProtectedRouteProps = {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--dv-background)] text-[var(--dv-foreground)]">
        <div className="text-sm text-white/60">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  return children
}




