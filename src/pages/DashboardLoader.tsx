import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DashboardStats, Transaction, Profile } from "@/types/database";
import Dashboard from "./Dashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { toast } from "sonner"; // Add this import

const fetchDashboardStats = async (): Promise<DashboardStats | null> => {
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error) {
    console.error("Error fetching dashboard stats:", error);
    throw new Error(error.message);
  }
  return data.length > 0 ? data[0] : null;
};

const fetchRecentTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase.rpc('get_my_transactions', {
    page_limit: 5,
    page_offset: 0,
  });
  if (error) {
    console.error("Error fetching recent transactions:", error);
    throw new Error(error.message);
  }
  return data;
};

const fetchMyProfile = async (): Promise<Profile | null> => {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) {
    console.error("Error fetching my profile:", error);
    throw new Error(error.message);
  }
  return data.length > 0 ? data[0] : null;
};

const DashboardLoader = () => {
  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsQueryError } = useQuery<DashboardStats | null>({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  });

  const { data: transactions, isLoading: transactionsLoading, isError: transactionsError, error: transactionsQueryError } = useQuery<Transaction[]>({
    queryKey: ['recentTransactions'],
    queryFn: fetchRecentTransactions,
  });

  const { data: profile, isLoading: profileLoading, isError: profileError, error: profileQueryError } = useQuery<Profile | null>({
    queryKey: ['myProfile'],
    queryFn: fetchMyProfile,
  });

  const isLoading = statsLoading || transactionsLoading || profileLoading;
  const isAnyError = statsError || transactionsError || profileError;

  // Display skeleton while loading
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // If any query resulted in a true error (e.g., network, RPC function error)
  if (isAnyError) {
    const errorMessage = statsQueryError?.message || transactionsQueryError?.message || profileQueryError?.message || "An unknown error occurred.";
    toast.error(`Failed to load dashboard: ${errorMessage}`);
    return <div className="text-center text-destructive p-8">An error occurred while loading dashboard data. Please try again later.</div>;
  }

  // If data is null/undefined after loading (meaning RPC returned empty array)
  if (!stats || !profile) {
    toast.error("Your account data is incomplete. Please contact support.");
    return <div className="text-center text-destructive p-8">Your account data could not be found. Please contact support.</div>;
  }

  // transactions can legitimately be an empty array, so no !transactions check here.
  return <Dashboard stats={stats} transactions={transactions} profile={profile} />;
};

export default DashboardLoader;