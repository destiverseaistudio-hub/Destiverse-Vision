import { Outlet, useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import Sidebar from '@/components/layout/Sidebar';
import UpdateRibbon from '@/components/layout/UpdateRibbon';
import NotificationBanner from '@/components/layout/NotificationBanner';
import CreatorNoticeBanner from '@/components/layout/CreatorNoticeBanner';
import MaintenanceGate from '@/components/layout/MaintenanceGate';
import AppFooter from '@/components/layout/AppFooter';
import ViewerAiAssistant from '@/components/layout/ViewerAiAssistant';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const savedPath = window.sessionStorage.getItem('dv-refresh-path');
    if (!savedPath) return;
    window.sessionStorage.removeItem('dv-refresh-path');
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== savedPath) navigate(savedPath, { replace: true });
  }, [navigate]);
  const isReelsExperience = pathname === '/dashboard/reels';
  return (
    <MaintenanceGate>
      <CreatorNoticeBanner />
      <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[var(--dv-background)] text-[var(--dv-foreground)]">
        <div className="flex min-h-screen w-full min-w-0">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <NotificationBanner />
            <UpdateRibbon />
            <main
              className={`min-h-0 w-full min-w-0 flex-1 overflow-y-auto ${isReelsExperience ? 'overflow-hidden p-0' : 'pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0'}`}
            >
              <div
                className={
                  isReelsExperience
                    ? 'h-full w-full'
                    : 'mx-auto w-full min-w-0 max-w-[var(--dv-content-max-width)] p-3 sm:p-6 lg:p-8'
                }
              >
                <Outlet />
              </div>
            </main>
            {!isReelsExperience ? <AppFooter /> : null}
          </div>
        </div>
        <MobileBottomNav />
        {!isReelsExperience ? <ViewerAiAssistant /> : null}
      </div>
    </MaintenanceGate>
  );
}
