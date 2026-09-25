import { useState } from "react"
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
  signUpSchema,
  type SignUpFormData,
} from "@/schemas/auth"

import { useSignUp } from "@/hooks/useSignUp"

export default function SignUpPage() {
  const navigate = useNavigate()

  const [successMessage, setSuccessMessage] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  })

  const {
    register: createAccount,
    loading,
    serverError,
  } = useSignUp()

  async function onSubmit(data: SignUpFormData) {
    if (loading || successMessage) {
      return
    }

    setSuccessMessage("")

    const result = await createAccount({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      confirmPassword: data.confirmPassword,
    })

    if (!result.success) {
      return
    }

    if (result.requiresEmailConfirmation) {
      setSuccessMessage(
        "Account created successfully. Please check your email to confirm your account before signing in.",
      )

      return
    }

    navigate("/dashboard", { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your DestiVerse Vision account</CardTitle>

          <CardDescription>
            Join DestiVerse Vision and start your journey into premium
            stories and entertainment.
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
                  errors.email ? "signup-email-error" : undefined
                }
                {...register("email")}
              />

              {errors.email && (
                <p
                  id="signup-email-error"
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
                autoComplete="new-password"
                placeholder="Create a secure password"
                aria-invalid={errors.password ? "true" : "false"}
                aria-describedby={
                  errors.password ? "signup-password-error" : undefined
                }
                {...register("password")}
              />

              {errors.password && (
                <p
                  id="signup-password-error"
                  role="alert"
                  className="text-sm text-red-500"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm Password
              </Label>

              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm your password"
                aria-invalid={
                  errors.confirmPassword ? "true" : "false"
                }
                aria-describedby={
                  errors.confirmPassword
                    ? "signup-confirm-password-error"
                    : undefined
                }
                {...register("confirmPassword")}
              />

              {errors.confirmPassword && (
                <p
                  id="signup-confirm-password-error"
                  role="alert"
                  className="text-sm text-red-500"
                >
                  {errors.confirmPassword.message}
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
              {loading ? "Creating Account..." : "Create Account"}
            </Button>

            <p className="text-center text-sm text-slate-600">
              Already have an account?{" "}
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
