import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const fetchCounts = async () => {
  const { data: investmentRequestsData, error: investmentRequestsError } = await supabase.rpc('get_all_investment_requests_count', { p_status_filter: 'Pending' });
  const { data: ticketsData, error: ticketsError } = await supabase.rpc('get_open_tickets_count_admin');
  const { data: investmentWithdrawalsData, error: investmentWithdrawalsError } = await supabase.rpc('get_all_investment_withdrawal_requests_count', { p_status_filter: 'Pending' });

  if (investmentRequestsError) console.error('Error fetching pending investment requests count:', investmentRequestsError.message);
  if (ticketsError) console.error('Error fetching open tickets count:', ticketsError.message);
  if (investmentWithdrawalsError) console.error('Error fetching pending investment withdrawal requests count:', investmentWithdrawalsError.message);

  const pendingInvestmentsCount = investmentRequestsData || 0;
  const openTicketsCount = ticketsData || 0;
  const pendingInvestmentWithdrawalsCount = investmentWithdrawalsData || 0;

  return { 
    pendingInvestmentsCount,
    openTicketsCount,
    pendingInvestmentWithdrawalsCount,
  };
};

export const useAdminActionCounts = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminActionCounts'],
    queryFn: fetchCounts,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return {
    pendingInvestmentsCount: data?.pendingInvestmentsCount ?? 0,
    openTicketsCount: data?.openTicketsCount ?? 0,
    pendingInvestmentWithdrawalsCount: data?.pendingInvestmentWithdrawalsCount ?? 0,
    isLoading,
    error,
  };
};