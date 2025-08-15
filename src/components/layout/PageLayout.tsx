import { Outlet, useOutletContext } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useState } from "react";
import { UserDetailsSheet } from "../admin/UserDetailsSheet";
import { useAuth } from "../auth/AuthProvider";
import { ImpersonationBanner } from "./ImpersonationBanner";

export type PageLayoutContext = {
  handleViewUser: (userId: string) => void;
};

export function usePageLayoutContext() {
  return useOutletContext<PageLayoutContext>();
}

export function PageLayout() {
  const { isImpersonating } = useAuth();
  const [selectedUserIdForSheet, setSelectedUserIdForSheet] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleViewUser = (userId: string) => {
    setSelectedUserIdForSheet(userId);
    setIsSheetOpen(true);
  };

  // This function will be passed to the sheet to handle recursive views
  const handleViewAnotherUser = (userId: string) => {
    // By setting the user ID, the sheet will re-fetch data for the new user
    setSelectedUserIdForSheet(userId);
    if (!isSheetOpen) {
      setIsSheetOpen(true);
    }
  };

  return (
    <>
      {isImpersonating && <ImpersonationBanner />}
      <div className="flex min-h-screen w-full">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="relative flex flex-1 flex-col min-w-0">
          <div
            className="absolute inset-0 z-[-1] bg-cover bg-center opacity-20"
            style={{
              backgroundImage: `url('https://ideogram.ai/assets/image/lossless/response/en5XqJOZStqt5DtSo2UG4A')`,
            }}
          />
          <Header handleViewUser={handleViewUser} />
          <main className="flex flex-1 flex-col gap-2 p-2 sm:gap-4 sm:p-4 lg:gap-6 lg:p-6">
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
};