import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

const fetchAdminActionCounts = async () => {
  const { count: kycCount, error: kycError } = await supabase.from('kyc_documents').select('id', { count: 'exact', head: true }).eq('status', 'Pending');
  const { count: depositsCount, error: depositsError } = await supabase.from('deposit_requests').select('id', { count: 'exact', head: true }).eq('status', 'Pending');
  const { count: withdrawalsCount, error: withdrawalsError } = await supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'Pending');
  const { count: investmentWithdrawalsCount, error: investmentWithdrawalsError } = await supabase.from('investment_withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'Pending');
  const { count: supportCount, error: supportError } = await supabase.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['Open', 'In Progress']);

  if (kycError || depositsError || withdrawalsError || supportError || investmentWithdrawalsError) {
    console.error("Error fetching counts:", { kycError, depositsError, withdrawalsError, supportError, investmentWithdrawalsError });
  }

  const pendingKycCount = kycCount ?? 0;
  const pendingDepositsCount = depositsCount ?? 0;
  const pendingWithdrawalsCount = withdrawalsCount ?? 0;
  const pendingInvestmentWithdrawalsCount = investmentWithdrawalsCount ?? 0;
  const openTicketsCount = supportCount ?? 0;

  return {
    pendingKycCount,
    pendingDepositsCount,
    pendingWithdrawalsCount,
    pendingInvestmentWithdrawalsCount,
    pendingRequestsCount: pendingKycCount + pendingDepositsCount + pendingWithdrawalsCount + pendingInvestmentWithdrawalsCount,
    openTicketsCount,
  };
};

export const useAdminActionCounts = () => {
  const { isAdmin } = useAuth();
  const { data } = useQuery({
    queryKey: ['adminActionCounts'],
    queryFn: fetchAdminActionCounts,
    enabled: isAdmin,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return data || {
    pendingKycCount: 0,
    pendingDepositsCount: 0,
    pendingWithdrawalsCount: 0,
    pendingInvestmentWithdrawalsCount: 0,
    pendingRequestsCount: 0,
    openTicketsCount: 0,
  };
};