import { useState } from "react"

import type { LoginFormData } from "@/schemas/auth"
import { signIn } from "@/services/auth"

export function useLogin() {
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)

  async function login(data: LoginFormData) {
    setLoading(true)
    setServerError("")

    const { data: session, error } = await signIn(
      data.email,
      data.password,
    )

    setLoading(false)

    if (error) {
      setServerError(error.message)
      return {
        success: false,
      }
    }

    return {
      success: true,
      session,
    }
  }

  return {
    login,
    loading,
    serverError,
  }
}
