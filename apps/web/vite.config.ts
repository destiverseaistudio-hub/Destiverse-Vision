import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const buildId = process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.VERCEL_DEPLOYMENT_ID
  || process.env.VITE_APP_BUILD_ID
  || `local-${Date.now()}`

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, "../..")
  const env = loadEnv(mode, envDir, "")

  return {
    // Load the Vercel project environment from the monorepo root.
    envDir,
    define: {
      "import.meta.env.VITE_APP_BUILD_ID": JSON.stringify(buildId),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL ?? ""),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(env.VITE_SUPABASE_ANON_KEY ?? ""),
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
  }
})
