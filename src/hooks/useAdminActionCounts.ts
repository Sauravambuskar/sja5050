import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useIsAdmin } from './useIsAdmin';
import { AdminDashboardStats } from '@/types/database';

const fetchAdminStats = async (): Promise<AdminDashboardStats> => {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
  if (error) throw new Error(error.message);
  return data[0];
};

const fetchOpenTicketsCount = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('get_open_tickets_count_admin');
  if (error) throw new Error(error.message);
  return data;
};

export const useAdminActionCounts = () => {
  const { isAdmin } = useIsAdmin();

  const { data, isLoading, error } = useQuery<AdminDashboardStats>({
    queryKey: ['adminDashboardStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
      if (error) throw new Error(error.message);
      return data[0];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: openTicketsCount } = useQuery<number>({
    queryKey: ['openTicketsCountAdmin'],
    queryFn: fetchOpenTicketsCount,
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  return {
    pendingKycCount: data?.pending_kyc ?? 0,
    pendingWithdrawalsCount: data?.pending_withdrawals_count ?? 0,
    pendingDepositsCount: data?.pending_deposits_count ?? 0,
    pendingInvestmentWithdrawalsCount: data?.pending_investment_withdrawals_count ?? 0,
    openTicketsCount: openTicketsCount ?? 0,
  };
};