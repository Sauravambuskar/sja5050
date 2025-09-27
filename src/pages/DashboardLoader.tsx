import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DashboardStats, Transaction, Profile } from "@/types/database";
import Dashboard from "./Dashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error) throw new Error(error.message);
  return data[0];
};

const fetchRecentTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase.rpc('get_my_transactions', {
    page_limit: 5,
    page_offset: 0,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchMyProfile = async (): Promise<Profile> => {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw new Error(error.message);
  return data[0];
};

const DashboardLoader = () => {
  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  });

  const { data: transactions, isLoading: transactionsLoading, isError: transactionsError } = useQuery<Transaction[]>({
    queryKey: ['recentTransactions'],
    queryFn: fetchRecentTransactions,
  });

  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery<Profile>({
    queryKey: ['myProfile'],
    queryFn: fetchMyProfile,
  });

  const isLoading = statsLoading || transactionsLoading || profileLoading;
  const isError = statsError || transactionsError || profileError;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !stats || !transactions || !profile) {
    return <div className="text-center text-destructive p-8">Could not load dashboard data. Please try again later.</div>;
  }

  return <Dashboard />;
};

export default DashboardLoader;