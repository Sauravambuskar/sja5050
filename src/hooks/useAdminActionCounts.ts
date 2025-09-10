import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from './useIsAdmin';
import { AdminDashboardStats } from "@/types/database";

const fetchAdminStats = async (): Promise<AdminDashboardStats> => {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
  if (error) throw new Error(error.message);
  return data[0];
};

export const useAdminActionCounts = () => {
  const { isAdmin } = useIsAdmin();

  const { data } = useQuery<AdminDashboardStats>({
    queryKey: ['adminDashboardStats'],
    queryFn: fetchAdminStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { data };
};