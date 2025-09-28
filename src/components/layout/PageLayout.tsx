import { Outlet, useOutletContext } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useState, useEffect } from "react";
import { UserDetailsSheet } from "../admin/UserDetailsSheet";
import { useAuth } from "../auth/AuthProvider";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

interface PageLayoutContextType {
  handleViewUser: (userId: string) => void;
}

export const usePageLayoutContext = () => {
  return useOutletContext<PageLayoutContextType>();
};

export const PageLayout = () => {
  const { data: profile } = useProfile();
  const isAdmin = profile?.role === 'admin';
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
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {isImpersonating && <ImpersonationBanner />}
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-background md:block">
          <Sidebar />
        </div>
        <div className="flex flex-col">
          <Header />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <Outlet context={{ handleViewUser }} />
          </main>
        </div>
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