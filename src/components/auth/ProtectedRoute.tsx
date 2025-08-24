import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { Loader2 } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { settings, isLoading: settingsLoading } = useSystemSettings();
  const location = useLocation();

  if (authLoading || settingsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
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

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};