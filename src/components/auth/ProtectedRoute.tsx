import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { Loader2 } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import MaintenancePage from "@/pages/MaintenancePage";

export const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();
  const { settings, isLoading: settingsLoading } = useSystemSettings();

  const isLoading = authLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (settings?.maintenance_mode_enabled) {
    return <MaintenancePage message={settings.maintenance_message} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};