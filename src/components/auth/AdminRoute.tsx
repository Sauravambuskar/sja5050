import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';

export const AdminRoute = () => {
  const { isAdmin, isLoading } = useIsAdmin();
  // Forward parent Outlet context (from PageLayout) to child routes under AdminRoute
  const parentContext = useOutletContext();

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

  // Pass the parent context down so usePageLayoutContext() works in nested admin pages
  return <Outlet context={parentContext} />;
};