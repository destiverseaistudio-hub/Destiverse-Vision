import { Navigate, Route, Routes } from "react-router-dom"

import DashboardPage from "@/pages/DashboardPage"
import LoginPage from "@/pages/LoginPage"
import ForgotPasswordPage from "@/pages/ForgotPasswordPage"
import ResetPasswordPage from "@/pages/ResetPasswordPage"
import SignUpPage from "@/pages/SignUpPage"
import UpdatesPage from "@/pages/UpdatesPage"
import HelpPage from "@/pages/HelpPage"
import InfoPage from "@/pages/InfoPage"
import ContentDetailPage from "@/pages/dashboard/ContentDetailPage"
import DashboardHome from "@/pages/dashboard/DashboardHome"
import CategoriesPage from "@/pages/dashboard/CategoriesPage"
import SearchPage from "@/pages/dashboard/SearchPage"
import WatchlistPage from "@/pages/dashboard/WatchlistPage"
import LibraryPage from "@/pages/dashboard/LibraryPage"
import ProfilePage from "@/pages/dashboard/ProfilePage"
import SettingsPage from "@/pages/dashboard/SettingsPage"
import ReelsPage from "@/pages/dashboard/ReelsPage"
import CreateReelPage from "@/pages/dashboard/CreateReelPage"
import CreatorProfilePage from "@/pages/dashboard/CreatorProfilePage"
import CreatorProfileEditorPage from "@/pages/dashboard/CreatorProfileEditorPage"
import CreatorStudioPage from "@/pages/dashboard/CreatorStudioPage"
import CreatorFilmStudioPage from "@/pages/dashboard/CreatorFilmStudioPage"
import ReelDetailPage from "@/pages/dashboard/ReelDetailPage"
import CreatorOnboardingPage from "@/pages/dashboard/CreatorOnboardingPage"
import NotificationsPage from "@/pages/dashboard/NotificationsPage"
import CreatorDiscoveryPage from "@/pages/dashboard/CreatorDiscoveryPage"
import OfflineWatchPage from "@/pages/dashboard/OfflineWatchPage"
import MembershipPage from "@/pages/dashboard/MembershipPage"
import PaymentReturnPage from "@/pages/dashboard/PaymentReturnPage"
import SoundPage from "@/pages/dashboard/SoundPage"
import ProtectedRoute from "@/routes/ProtectedRoute"

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/updates" element={<UpdatesPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/about" element={<InfoPage page="about" />} />
      <Route path="/privacy" element={<InfoPage page="privacy" />} />
      <Route path="/terms" element={<InfoPage page="terms" />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="watchlist" element={<WatchlistPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="offline" element={<OfflineWatchPage />} />
        <Route path="membership" element={<MembershipPage />} />
        <Route path="payment" element={<PaymentReturnPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reels" element={<ReelsPage />} />
        <Route path="reels/:reelId" element={<ReelDetailPage />} />
        <Route path="sounds/:soundKey" element={<SoundPage />} />
        <Route path="create-reel" element={<CreateReelPage />} />
        <Route path="creator-studio" element={<CreatorStudioPage />} />
        <Route path="creator-film-studio" element={<CreatorFilmStudioPage />} />
        <Route path="creators" element={<CreatorDiscoveryPage />} />
        <Route path="creator/:creatorId" element={<CreatorProfilePage />} />
        <Route path="creator/edit" element={<CreatorProfileEditorPage />} />
        <Route path="creator-onboarding" element={<CreatorOnboardingPage />} />
        <Route path="content/:contentId" element={<ContentDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
