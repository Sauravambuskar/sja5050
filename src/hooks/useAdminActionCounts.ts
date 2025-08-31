import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const fetchCounts = async () => {
  const { data: withdrawalData, error: withdrawalError } = await supabase.rpc('get_all_withdrawal_requests_count', { p_status_filter: 'Pending' });
  const { data: ticketsData, error: ticketsError } = await supabase.rpc('get_open_tickets_count_admin');
  const { data: investmentRequestsData, error: investmentRequestsError } = await supabase.rpc('get_all_investment_requests_count', { p_status_filter: 'Pending' });

  if (withdrawalError) console.error('Error fetching pending withdrawal count:', withdrawalError.message);
  if (ticketsError) console.error('Error fetching open tickets count:', ticketsError.message);
  if (investmentRequestsError) console.error('Error fetching pending investment requests count:', investmentRequestsError.message);

  const pendingWithdrawalsCount = withdrawalData || 0;
  const openTicketsCount = ticketsData || 0;
  const pendingInvestmentsCount = investmentRequestsData || 0;

  return { 
    pendingWithdrawalsCount, 
    openTicketsCount,
    pendingInvestmentsCount,
  };
};

export const useAdminActionCounts = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminActionCounts'],
    queryFn: fetchCounts,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return {
    pendingWithdrawalsCount: data?.pendingWithdrawalsCount ?? 0,
    openTicketsCount: data?.openTicketsCount ?? 0,
    pendingInvestmentsCount: data?.pendingInvestmentsCount ?? 0,
    isLoading,
    error,
  };
};