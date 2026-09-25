import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const appDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: appDirectory,
  envDir: appDirectory,
  plugins: [react(), tailwindcss()],
  server: {
    host: "localhost",
    port: 5174,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
