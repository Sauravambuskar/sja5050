import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

const checkIsAdmin = async () => {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    console.error('Admin check failed:', error.message);
    return false;
  }
  return data;
};

export const useIsAdmin = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: isAdmin, isLoading: isAdminLoading } = useQuery<boolean>({
    queryKey: ['isAdmin', user?.id],
    queryFn: checkIsAdmin,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    isAdmin: isAdmin ?? false,
    isLoading: authLoading || isAdminLoading,
  };
};