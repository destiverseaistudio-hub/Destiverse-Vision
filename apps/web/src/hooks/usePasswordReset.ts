import { useRef, useState } from "react"

import type { ResetPasswordFormData } from "@/schemas/auth"
import {
  requestPasswordReset,
  updatePassword,
} from "@/services/auth"

function getPasswordResetRequestErrorMessage(message: string) {
  const normalized = message.toLowerCase()

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

  return "We couldn't process your password reset request. Please try again."
}

function getPasswordUpdateErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (
    normalized.includes("session") ||
    normalized.includes("jwt") ||
    normalized.includes("token") ||
    normalized.includes("auth session missing")
  ) {
    return "Your password reset session is no longer valid. Please request a new password reset email."
  }

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network")
  ) {
    return "We couldn't connect to the authentication service. Please check your internet connection and try again."
  }

  if (normalized.includes("password")) {
    return "Your new password could not be accepted. Please check the password requirements and try again."
  }

  return "We couldn't update your password. Please request a new reset email and try again."
}

export function usePasswordReset() {
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const submittingRef = useRef(false)

  async function requestReset(email: string) {
    if (submittingRef.current) {
      return {
        success: false,
      }
    }

    submittingRef.current = true
    setLoading(true)
    setServerError("")
    setSuccessMessage("")

    try {
      const { error } = await requestPasswordReset(
        email.trim().toLowerCase(),
      )

      if (error) {
        setServerError(
          getPasswordResetRequestErrorMessage(error.message),
        )

        return {
          success: false,
        }
      }

      setSuccessMessage(
        "If an account exists for that email address, a password reset link has been sent. Please check your inbox.",
      )

      return {
        success: true,
      }
    }
    catch {
      setServerError(
        "We couldn't connect to the authentication service. Please check your internet connection and try again.",
      )

      return {
        success: false,
      }
    }
    finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  async function resetPassword(
    data: ResetPasswordFormData,
  ) {
    if (submittingRef.current) {
      return {
        success: false,
      }
    }

    submittingRef.current = true
    setLoading(true)
    setServerError("")
    setSuccessMessage("")

    try {
      const { error } = await updatePassword(
        data.password,
      )

      if (error) {
        setServerError(
          getPasswordUpdateErrorMessage(error.message),
        )

        return {
          success: false,
        }
      }

      setSuccessMessage(
        "Your password has been updated successfully.",
      )

      return {
        success: true,
      }
    }
    catch {
      setServerError(
        "We couldn't connect to the authentication service. Please check your internet connection and try again.",
      )

      return {
        success: false,
      }
    }
    finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return {
    loading,
    serverError,
    successMessage,
    requestReset,
    resetPassword,
  }
}
