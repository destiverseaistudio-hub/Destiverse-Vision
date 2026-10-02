import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const appDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(appDirectory, "../..")
  const env = loadEnv(mode, envDir, "")

  return {
    root: appDirectory,
    envDir,
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL ?? ""),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(env.VITE_SUPABASE_ANON_KEY ?? ""),
    },
    plugins: [react(), tailwindcss()],
    server: {
      host: "localhost",
      port: 5174,
      strictPort: true,
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
  }
})
