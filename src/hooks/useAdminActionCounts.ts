import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const fetchAdminActionCounts = async () => {
  const { count: kycCount, error: kycError } = await supabase
    .from("kyc_documents")
    .select("id", { count: "exact", head: true })
    .eq("status", "Pending");

  const { data: ticketsData, error: ticketsError } = await supabase.rpc('get_open_tickets_count_admin');

  if (kycError) console.error("Error fetching pending KYC count:", kycError.message);
  if (ticketsError) console.error("Error fetching open tickets count:", ticketsError.message);

  return {
    pendingKycCount: kycCount ?? 0,
    openTicketsCount: ticketsData ?? 0,
  };
};

export const useAdminActionCounts = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["adminActionCounts"],
    queryFn: fetchAdminActionCounts,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return {
    pendingKycCount: data?.pendingKycCount ?? 0,
    openTicketsCount: data?.openTicketsCount ?? 0,
    isLoading,
    error,
  };
};