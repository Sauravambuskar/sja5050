import { Outlet, useOutletContext } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { Header } from "../layout/Header";
import { useState } from "react";
import { UserDetailsSheet } from "./UserDetailsSheet";
import { useAuth } from "../auth/AuthProvider";
import { ImpersonationBanner } from "../layout/ImpersonationBanner";

export function usePageLayoutContext() {
  return useOutletContext<any>();
}

export default function AdminLayout() {
  const { isImpersonating } = useAuth();
  const [selectedUserIdForSheet, setSelectedUserIdForSheet] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleViewUser = (userId: string) => {
    setSelectedUserIdForSheet(userId);
    setIsSheetOpen(true);
  };

  const handleViewAnotherUser = (userId: string) => {
    setSelectedUserIdForSheet(userId);
    if (!isSheetOpen) {
      setIsSheetOpen(true);
    }
  };

  return (
    <>
      {isImpersonating && <ImpersonationBanner />}
      <div className="flex min-h-screen w-full bg-muted/40">
        <div className="hidden md:block">
          <AdminSidebar />
        </div>
        <div className="flex flex-1 flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <Header handleViewUser={handleViewUser} />
          <main className="flex-1 p-4 sm:px-6 sm:py-0 gap-4">
            <Outlet context={{ handleViewUser }} />
          </main>
        </div>
      </div>
      <UserDetailsSheet 
        userId={selectedUserIdForSheet} 
        isOpen={isSheetOpen} 
        onOpenChange={setIsSheetOpen} 
        onViewUser={handleViewAnotherUser} 
      />
    </>
  );
}