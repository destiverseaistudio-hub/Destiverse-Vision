import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom"

import LoginPage from "@/pages/LoginPage"
import DashboardPage from "@/pages/DashboardPage"

import DashboardHome from "@/pages/dashboard/DashboardHome"
import CategoriesPage from "@/pages/dashboard/CategoriesPage"
import SearchPage from "@/pages/dashboard/SearchPage"
import WatchlistPage from "@/pages/dashboard/WatchlistPage"
import LibraryPage from "@/pages/dashboard/LibraryPage"
import ProfilePage from "@/pages/dashboard/ProfilePage"
import SettingsPage from "@/pages/dashboard/SettingsPage"

import ProtectedRoute from "@/components/auth/ProtectedRoute"

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<LoginPage />}
        />

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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

      </Routes>
    </BrowserRouter>
  )
}
