import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.destiverse.vision",
  appName: "DestiVerse Vision",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
}

export default config
