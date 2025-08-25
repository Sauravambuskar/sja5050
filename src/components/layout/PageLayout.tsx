import { Outlet, useOutletContext } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/sonner";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Loader2 } from "lucide-react";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { useAuth } from "../auth/AuthProvider";
import { useState } from "react";
import { UserDetailsSheet } from "../admin/users/UserDetailsSheet";

export type PageLayoutContext = {
  handleViewUser: (userId: string) => void;
};

export function PageLayout() {
  const { isImpersonating } = useAuth();
  const { settings, isLoading } = useSystemSettings();
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const handleViewUser = (userId: string) => {
    setViewingUserId(userId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (settings?.maintenance_mode_enabled) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <h1 className="text-3xl font-bold mb-4">Under Maintenance</h1>
        <p className="text-muted-foreground">{settings.maintenance_message || "We'll be back shortly. Thank you for your patience."}</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        {isImpersonating && <ImpersonationBanner />}
        <Header />
        <main className="flex flex-1 flex-col gap-2 p-2 sm:gap-4 sm:p-4 lg:gap-6 lg:p-6">
          <Outlet context={{ handleViewUser }} />
        </main>
      </div>
      <Toaster />
      <UserDetailsSheet
        userId={viewingUserId}
        isOpen={!!viewingUserId}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setViewingUserId(null);
          }
        }}
      />
    </div>
  );
}