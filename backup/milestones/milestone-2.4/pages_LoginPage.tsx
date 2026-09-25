import { useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  loginSchema,
  type LoginFormData,
} from "@/schemas/auth"

import { useLogin } from "@/hooks/useLogin"
import { useAuth } from "@/contexts/AuthContext"

export default function LoginPage() {
  const navigate = useNavigate()

  const {
    session,
    loading: authLoading,
  } = useAuth()

  const {
    login,
    loading,
    serverError,
  } = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (!authLoading && session) {
      navigate("/dashboard", { replace: true })
    }
  }, [session, authLoading, navigate])

  async function onSubmit(data: LoginFormData) {
    if (loading) {
      return
    }

    const result = await login({
      email: data.email.trim().toLowerCase(),
      password: data.password,
    })

    if (result.success) {
      navigate("/dashboard", { replace: true })
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>DestiVerse Vision</CardTitle>

          <CardDescription>
            Sign in to continue
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-5"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>

              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="you@example.com"
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={
                  errors.email ? "email-error" : undefined
                }
                {...register("email")}
              />

              {errors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="text-sm text-red-500"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>

              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={errors.password ? "true" : "false"}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                {...register("password")}
              />

              {errors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="text-sm text-red-500"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700"
              >
                {serverError}
              </div>
            )}

            <Button
              className="w-full"
              type="submit"
              disabled={loading || authLoading}
              aria-busy={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>

            <p className="text-center text-sm text-slate-600">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-medium underline"
              >
                Create one
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
