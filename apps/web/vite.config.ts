import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const buildId = process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.VERCEL_DEPLOYMENT_ID
  || process.env.VITE_APP_BUILD_ID
  || `local-${Date.now()}`

export default defineConfig({
  define: {
    __DESTIVERSE_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    chunkSizeWarningLimit: 1000,
  },
})
