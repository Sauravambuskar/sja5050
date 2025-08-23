import { useAuth } from './AuthProvider';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import MaintenancePage from '@/pages/Maintenance';

export const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { settings, isLoading: settingsLoading } = useSystemSettings();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const location = useLocation();

  const isLoading = authLoading || settingsLoading || isAdminLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect_to=${location.pathname}`} replace />;
  }

  if (settings?.maintenance_mode_enabled && !isAdmin) {
    return <MaintenancePage message={settings.maintenance_message} />;
  }

  return children ? <>{children}</> : <Outlet />;
};