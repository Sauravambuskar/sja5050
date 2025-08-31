import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const fetchCounts = async () => {
  const { data: kycData, error: kycError } = await supabase.rpc('get_all_kyc_requests', { p_status_filter: 'Pending' });
  const { data: depositData, error: depositError } = await supabase.rpc('get_all_deposit_requests_count', { p_status_filter: 'Pending' });
  const { data: withdrawalData, error: withdrawalError } = await supabase.rpc('get_all_withdrawal_requests_count', { p_status_filter: 'Pending' });
  const { data: ticketsData, error: ticketsError } = await supabase.rpc('get_open_tickets_count_admin');
  const { data: investmentRequestsData, error: investmentRequestsError } = await supabase.rpc('get_all_investment_requests_count', { p_status_filter: 'Pending' });
  const { data: investmentWithdrawalsData, error: investmentWithdrawalsError } = await supabase.rpc('get_all_investment_withdrawal_requests_count', { p_status_filter: 'Pending' });

  if (kycError) console.error('Error fetching pending KYC count:', kycError.message);
  if (depositError) console.error('Error fetching pending deposit count:', depositError.message);
  if (withdrawalError) console.error('Error fetching pending withdrawal count:', withdrawalError.message);
  if (ticketsError) console.error('Error fetching open tickets count:', ticketsError.message);
  if (investmentRequestsError) console.error('Error fetching pending investment requests count:', investmentRequestsError.message);
  if (investmentWithdrawalsError) console.error('Error fetching pending investment withdrawal requests count:', investmentWithdrawalsError.message);

  const pendingKycCount = kycData?.length || 0;
  const pendingDepositsCount = depositData || 0;
  const pendingWithdrawalsCount = withdrawalData || 0;
  const pendingRequestsCount = pendingDepositsCount + pendingWithdrawalsCount;
  const openTicketsCount = ticketsData || 0;
  const pendingInvestmentsCount = investmentRequestsData || 0;
  const pendingInvestmentWithdrawalsCount = investmentWithdrawalsData || 0;

  return { 
    pendingKycCount, 
    pendingDepositsCount, 
    pendingWithdrawalsCount, 
    pendingRequestsCount, 
    openTicketsCount,
    pendingInvestmentsCount,
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
    pendingKycCount: data?.pendingKycCount ?? 0,
    pendingDepositsCount: data?.pendingDepositsCount ?? 0,
    pendingWithdrawalsCount: data?.pendingWithdrawalsCount ?? 0,
    pendingRequestsCount: data?.pendingRequestsCount ?? 0,
    openTicketsCount: data?.openTicketsCount ?? 0,
    pendingInvestmentsCount: data?.pendingInvestmentsCount ?? 0,
    pendingInvestmentWithdrawalsCount: data?.pendingInvestmentWithdrawalsCount ?? 0,
    isLoading,
    error,
  };
};