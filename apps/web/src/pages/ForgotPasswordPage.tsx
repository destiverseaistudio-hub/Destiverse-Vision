import { Link } from "react-router-dom"
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
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/schemas/auth"

import { usePasswordReset } from "@/hooks/usePasswordReset"

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const {
    loading,
    serverError,
    successMessage,
    requestReset,
  } = usePasswordReset()

  async function onSubmit(data: ForgotPasswordFormData) {
    if (loading || successMessage) {
      return
    }

    await requestReset(
      data.email.trim().toLowerCase(),
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>

          <CardDescription>
            Enter your email address and we will send you a
            secure password reset link if an account exists.
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
                  errors.email
                    ? "forgot-password-email-error"
                    : undefined
                }
                {...register("email")}
              />

              {errors.email && (
                <p
                  id="forgot-password-email-error"
                  role="alert"
                  className="text-sm text-red-500"
                >
                  {errors.email.message}
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

            {successMessage && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700"
              >
                {successMessage}
              </div>
            )}

            <Button
              className="w-full"
              type="submit"
              disabled={loading || Boolean(successMessage)}
              aria-busy={loading}
            >
              {loading
                ? "Sending Reset Link..."
                : "Send Reset Link"}
            </Button>

            <p className="text-center text-sm text-slate-600">
              Remember your password?{" "}
              <Link
                to="/"
                className="font-medium underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
