import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Wallet, ShieldCheck, GitPullRequest } from "lucide-react";
import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import { HighValueTransactions } from "@/components/admin/HighValueTransactions";
import { AdminUserSearch } from "@/components/admin/AdminUserSearch";
import { useNavigate } from "react-router-dom";
import { AdminDashboardStats } from "@/types/database";

const fetchAdminStats = async (): Promise<AdminDashboardStats> => {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
  if (error) throw new Error(error.message);
  
  console.log('Raw stats data from RPC:', data);
  
  // Handle both array and object responses
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  } else if (data && typeof data === 'object') {
    return data;
  }
  
  // Return default values if no data
  return {
    total_users: 0,
    aum: 0,
    pending_kyc: 0,
    pending_withdrawals_count: 0,
    pending_withdrawals_value: 0,
    pending_deposits_count: 0,
    pending_deposits_value: 0,
    pending_investments_count: 0,
    pending_investments_value: 0,
    pending_investment_withdrawals_count: 0,
    monthly_payout_projection: 0,
    pending_cancellations_count: 0,
    total_active_investments_count: 0,
    total_matured_investments_count: 0,
    total_investment_amount_ever: 0,
    open_tickets_count: 0
  };
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useQuery<AdminDashboardStats>({
    queryKey: ['adminStats'],
    queryFn: fetchAdminStats,
  });

  // Debug logging
  console.log('Admin Dashboard Stats:', stats);
  console.log('Is Loading:', isLoading);
  console.log('Error:', error);

  const handleViewUser = (userId: string) => {
    navigate(`/admin/user-management?user=${userId}`);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <AdminUserSearch onUserSelect={handleViewUser} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">₹{(stats?.aum || 0).toLocaleString('en-IN')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.pending_kyc || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <GitPullRequest className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.pending_withdrawals_count || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed and High Value Transactions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <AdminActivityFeed />
        </div>
        <div className="lg:col-span-3">
          <HighValueTransactions />
        </div>
      </div>
    </div>
  );
}