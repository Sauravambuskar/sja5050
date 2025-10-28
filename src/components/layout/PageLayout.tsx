import { Outlet, useOutletContext } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useState, useEffect } from "react";
import { UserDetailsSheet } from "../admin/UserDetailsSheet";
import { useAuth } from "../auth/AuthProvider";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface PageLayoutContextType {
  handleViewUser: (userId: string) => void;
}

export const usePageLayoutContext = () => {
  return useOutletContext<PageLayoutContextType>();
};

export const PageLayout = () => {
  const { isAdmin } = useIsAdmin();
  const { isImpersonating } = useAuth();
  const { settings: systemSettings } = useSystemSettings();

  const [isUserDetailsSheetOpen, setIsUserDetailsSheetOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleViewUser = (userId: string) => {
    setSelectedUserId(userId);
    setIsUserDetailsSheetOpen(true);
  };

  useEffect(() => {
    if (!isUserDetailsSheetOpen) {
      setSelectedUserId(null);
    }
  }, [isUserDetailsSheetOpen]);

  if (systemSettings?.maintenance_mode_enabled && !isAdmin) {
    return <ImpersonationBanner />; // Maintenance component will be rendered by router
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {isImpersonating && <ImpersonationBanner />}
      
      {/* Desktop Sidebar (enabled for all users) */}
      <div className="hidden border-r bg-background md:block md:w-[220px] lg:w-[280px]">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="flex flex-col gap-4 lg:gap-6">
            <Outlet context={{ handleViewUser }} />
          </div>
        </main>
      </div>

      {selectedUserId && (
        <UserDetailsSheet
          userId={selectedUserId}
          isOpen={isUserDetailsSheetOpen}
          onOpenChange={setIsUserDetailsSheetOpen}
          onViewUser={handleViewUser}
        />
      )}
    </div>
  );
};