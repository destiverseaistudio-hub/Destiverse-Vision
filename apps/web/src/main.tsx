import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "./index.css"

import App from "./App"
import AppErrorBoundary from "@/components/layout/AppErrorBoundary"
import { registerAppServiceWorker } from "@/lib/app-update"
import { AuthProvider } from "@/contexts/AuthContext"
import { FeatureFlagProvider } from "@/contexts/FeatureFlagContext"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FeatureFlagProvider>
          <AppErrorBoundary><App /></AppErrorBoundary>
        </FeatureFlagProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

registerAppServiceWorker()
