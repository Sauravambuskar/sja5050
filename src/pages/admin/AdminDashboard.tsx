import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, UserCheck, Hourglass, ArrowDownToDot } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminDashboardStats, AdminUserView, AdminHighValueTransaction } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import UserGrowthChart from "@/components/admin/UserGrowthChart";
import AumGrowthChart from "@/components/admin/AumGrowthChart";
import CommissionPayoutChart from "@/components/admin/CommissionPayoutChart";
import NewInvestmentsChart from "@/components/admin/NewInvestmentsChart";
import { Link, useOutletContext } from "react-router-dom";
import { PageLayoutContext } from "@/components/layout/PageLayout";
import { getGeneratedAvatarUrl } from "@/lib/utils";

const fetchAdminStats = async (): Promise<AdminDashboardStats> => {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
  if (error) throw new Error(error.message);
  return data[0];
};

const fetchRecentUsers = async (): Promise<AdminUserView[]> => {
  const { data, error } = await supabase.rpc('get_all_users_details', {
    search_text: null,
    kyc_status_filter: null,
    account_status_filter: null,
    page_limit: 5,
    page_offset: 0
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchHighValueTransactions = async (): Promise<AdminHighValueTransaction[]> => {
  const { data, error } = await supabase.rpc('get_high_value_transactions');
  if (error) throw new Error(error.message);
  return data;
};

const AdminDashboard = () => {
  const { handleViewUser } = useOutletContext<PageLayoutContext>();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminDashboardStats>({
    queryKey: ['adminDashboardStats'],
    queryFn: fetchAdminStats,
  });

  const { data: recentUsers, isLoading: usersLoading } = useQuery<AdminUserView[]>({
    queryKey: ['recentUsers'],
    queryFn: fetchRecentUsers,
  });

  const { data: highValueTransactions, isLoading: transactionsLoading } = useQuery<AdminHighValueTransaction[]>({
    queryKey: ['highValueTransactions'],
    queryFn: fetchHighValueTransactions,
  });

  const kpiData = [
    { title: "Total Users", value: stats?.total_users.toLocaleString() ?? "0", icon: Users, to: "/admin/users" },
    { title: "Assets Under Management", value: `₹${stats?.aum.toLocaleString('en-IN') ?? "0"}`, icon: DollarSign, to: "/admin/investments" },
    { title: "Pending KYC Verifications", value: stats?.pending_kyc.toLocaleString() ?? "0", icon: UserCheck, to: "/admin/kyc" },
    { title: "Pending Deposits", value: `${stats?.pending_deposits_count ?? "0"} (₹${stats?.pending_deposits_value.toLocaleString('en-IN') ?? "0"})`, icon: ArrowDownToDot, to: "/admin/deposits" },
    { title: "Pending Withdrawals", value: `${stats?.pending_withdrawals_count ?? "0"} (₹${stats?.pending_withdrawals_value.toLocaleString('en-IN') ?? "0"})`, icon: Hourglass, to: "/admin/withdrawals" },
  ];

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of platform KPIs and activities.</p>
        </div>
      </div>
      
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {statsLoading ? (
          [...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-2/3 mt-1" /></CardContent>
            </Card>
          ))
        ) : (
          kpiData.map((kpi, index) => (
            <Link to={kpi.to} key={index}>
              <Card className="transition-all hover:bg-accent hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <UserGrowthChart />
        <AumGrowthChart />
        <NewInvestmentsChart />
        <CommissionPayoutChart />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {recentUsers?.map((user) => (
                  <button key={user.id} className="flex w-full items-center rounded-md p-2 text-left transition-colors hover:bg-accent" onClick={() => handleViewUser(user.id)}>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url || getGeneratedAvatarUrl(user.full_name)} />
                      <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="ml-auto text-sm text-muted-foreground">
                      {format(new Date(user.join_date), "PPP")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>High-Value Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : highValueTransactions && highValueTransactions.length > 0 ? (
              <div className="space-y-4">
                {highValueTransactions.map((txn) => (
                  <button key={txn.id} className="flex w-full items-center rounded-md p-2 text-left transition-colors hover:bg-accent" onClick={() => handleViewUser(txn.user_id)}>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{getInitials(txn.user_name)}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{txn.user_name}</p>
                      <p className="text-sm text-muted-foreground">{txn.type}</p>
                    </div>
                    <div className="ml-auto font-medium">
                      +₹{txn.amount.toLocaleString('en-IN')}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                No high-value transactions to display.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};
export default AdminDashboard;