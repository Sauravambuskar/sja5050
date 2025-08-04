import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useIsAdmin } from './useIsAdmin';
import { AdminDashboardStats } from '@/types/database';

const fetchAdminStats = async (): Promise<AdminDashboardStats> => {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
  if (error) throw new Error(error.message);
  return data[0];
};

export const useAdminActionCounts = () => {
  const { isAdmin } = useIsAdmin();

  const { data: stats } = useQuery<AdminDashboardStats>({
    queryKey: ['adminDashboardStats'], // Re-use the same key as the dashboard
    queryFn: fetchAdminStats,
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    pendingKycCount: stats?.pending_kyc ?? 0,
    pendingWithdrawalsCount: stats?.pending_withdrawals_count ?? 0,
    pendingDepositsCount: stats?.pending_deposits_count ?? 0,
  };
};