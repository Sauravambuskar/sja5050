import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const checkIsAdmin = async () => {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    console.error('Admin check failed:', error);
    return false;
  }
  return data;
};

export const AdminRoute = () => {
  const { data: isAdmin, isLoading, isError } = useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: checkIsAdmin,
    retry: false, // Don't retry on failure
  });

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !isAdmin) {
    // Redirect non-admins to the user dashboard
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};