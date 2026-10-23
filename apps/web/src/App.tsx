import AppRouter from "@/routes/AppRouter"
import { ContentProvider } from "@/contexts/ContentContext"
import VersionGate from "@/components/layout/VersionGate"
import WelcomeSplash from "@/components/layout/WelcomeSplash"

export default function App() {
  return (
    <ContentProvider>
      <VersionGate>
        <WelcomeSplash>
          <AppRouter />
        </WelcomeSplash>
      </VersionGate>
    </ContentProvider>
  )
}
