import { useState } from "react"

import type { LoginFormData } from "@/schemas/auth"
import { signIn } from "@/services/auth"

function getLoginErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "The email or password is incorrect. Please check your details and try again."
  }

  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("email_not_confirmed")
  ) {
    return "Your email address has not been confirmed yet. Please check your inbox and confirm your account before signing in."
  }

  if (
    normalized.includes("too many requests") ||
    normalized.includes("rate limit")
  ) {
    return "Too many sign-in attempts. Please wait a moment and try again."
  }

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network")
  ) {
    return "We couldn't connect to the authentication service. Please check your internet connection and try again."
  }

  return "We couldn't sign you in. Please check your details and try again."
}

export function useLogin() {
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)

  async function login(data: LoginFormData) {
    if (loading) {
      return {
        success: false,
        session: null,
      }
    }

    setLoading(true)
    setServerError("")

    try {
      const { data: result, error } = await signIn(
        data.email,
        data.password,
      )

      if (error) {
        setServerError(getLoginErrorMessage(error.message))

        return {
          success: false,
          session: null,
        }
      }

      return {
        success: true,
        session: result.session,
      }
    }
    catch {
      setServerError(
        "We couldn't connect to the authentication service. Please check your internet connection and try again.",
      )

      return {
        success: false,
        session: null,
      }
    }
    finally {
      setLoading(false)
    }
  }

  return {
    login,
    loading,
    serverError,
  }
}
