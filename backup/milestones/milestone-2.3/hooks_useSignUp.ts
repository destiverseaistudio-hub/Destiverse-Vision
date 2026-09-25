import { useState } from "react"

import type { SignUpFormData } from "@/schemas/auth"
import { signUp } from "@/services/auth"

export function useSignUp() {
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)

  async function register(data: SignUpFormData) {
    setLoading(true)
    setServerError("")

    const { data: result, error } = await signUp(
      data.email,
      data.password,
    )

    setLoading(false)

    if (error) {
      setServerError(error.message)

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

  return {
    register,
    loading,
    serverError,
  }
}
