import { useContext } from "react"
import { ContentContext } from "@/contexts/ContentContextDef"

export function useContent() {
  const context = useContext(ContentContext)
  if (!context) {
    throw new Error("useContent must be used inside ContentProvider")
  }
  return context
}
