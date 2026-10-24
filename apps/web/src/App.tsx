import AppRouter from "@/routes/AppRouter"
import { ContentProvider } from "@/contexts/ContentContext"
import WelcomeSplash from "@/components/layout/WelcomeSplash"

export default function App() {
  return (
    <ContentProvider>
      <WelcomeSplash>
        <AppRouter />
      </WelcomeSplash>
    </ContentProvider>
  )
}
