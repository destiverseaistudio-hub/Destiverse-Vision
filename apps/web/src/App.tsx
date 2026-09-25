import AppRouter from "@/routes/AppRouter"
import { ContentProvider } from "@/contexts/ContentContext"
import VersionGate from "@/components/layout/VersionGate"

export default function App() {
  return (
    <ContentProvider>
      <VersionGate>
        <AppRouter />
      </VersionGate>
    </ContentProvider>
  )
}
