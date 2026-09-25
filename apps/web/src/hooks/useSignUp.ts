import { useRef, useState } from "react"

import type { SignUpFormData } from "@/schemas/auth"
import { signUp } from "@/services/auth"

function getSignUpErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (
    normalized.includes("already registered") ||
    normalized.includes("user already exists") ||
    normalized.includes("already been registered")
  ) {
    return "An account with this email already exists. Please sign in instead."
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  ) {
    return "Too many attempts. Please wait a moment and try again."
  }

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network")
  ) {
    return "We couldn't connect to the authentication service. Please check your internet connection and try again."
  }

  if (normalized.includes("password")) {
    return "Your password could not be accepted. Please check the password requirements and try again."
  }

  if (normalized.includes("email")) {
    return "Please check your email address and try again."
  }

  return "We couldn't create your account. Please try again."
}

export function useSignUp() {
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)

  const submittingRef = useRef(false)

  async function register(data: SignUpFormData) {
    if (submittingRef.current) {
      return {
        success: false,
        session: null,
        requiresEmailConfirmation: false,
      }
    }

    submittingRef.current = true
    setLoading(true)
    setServerError("")

    try {
      const { data: result, error } = await signUp(
        data.email.trim().toLowerCase(),
        data.password,
      )

      if (error) {
        setServerError(getSignUpErrorMessage(error.message))

        return {
          success: false,
          session: null,
          requiresEmailConfirmation: false,
        }
      }

      return {
        success: true,
        session: result.session,
        requiresEmailConfirmation: !result.session,
      }
    }
    catch {
      setServerError(
        "We couldn't connect to the authentication service. Please check your internet connection and try again.",
      )

      return {
        success: false,
        session: null,
        requiresEmailConfirmation: false,
      }
    }
    finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return {
    register,
    loading,
    serverError,
  }
}
