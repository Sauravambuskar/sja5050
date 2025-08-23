import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { PageLayoutContext } from '../layout/PageLayout';

export const AdminRoute = () => {
  const { isAdmin, isLoading } = useIsAdmin();
  const context = useOutletContext<PageLayoutContext>();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    // Redirect non-admins to the user dashboard
    return <Navigate to="/" replace />;
  }

  return <Outlet context={context} />;
};