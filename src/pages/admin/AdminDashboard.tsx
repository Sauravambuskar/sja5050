import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, UserCheck, Hourglass } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminDashboardStats, AdminUserView } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

const fetchAdminStats = async (): Promise<AdminDashboardStats> => {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
  if (error) throw new Error(error.message);
  // The RPC returns an array with one object, so we extract it.
  return data[0];
};

const fetchRecentUsers = async (): Promise<AdminUserView[]> => {
  const { data, error } = await supabase.rpc('get_all_users_details');
  if (error) throw new Error(error.message);
  return data.slice(0, 5); // Get the 5 most recent users
};

const AdminDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminDashboardStats>({
    queryKey: ['adminDashboardStats'],
    queryFn: fetchAdminStats,
  });

  const { data: recentUsers, isLoading: usersLoading } = useQuery<AdminUserView[]>({
    queryKey: ['recentUsers'],
    queryFn: fetchRecentUsers,
  });

  const kpiData = [
    { title: "Total Users", value: stats?.total_users.toLocaleString() ?? "0", icon: Users },
    { title: "Assets Under Management", value: `₹${stats?.aum.toLocaleString('en-IN') ?? "0"}`, icon: DollarSign },
    { title: "Pending KYC Verifications", value: stats?.pending_kyc.toLocaleString() ?? "0", icon: UserCheck },
    { title: "Pending Withdrawals", value: `${stats?.pending_withdrawals_count ?? "0"} (₹${stats?.pending_withdrawals_value.toLocaleString('en-IN') ?? "0"})`, icon: Hourglass },
  ];

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-muted-foreground">Overview of platform KPIs and activities.</p>
      
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-2/3 mt-1" /></CardContent>
            </Card>
          ))
        ) : (
          kpiData.map((kpi, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          ))
        )}
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
                  <div key={user.id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="ml-auto text-sm text-muted-foreground">
                      {format(new Date(user.join_date), "PPP")}
                    </div>
                  </div>
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
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              Feed of significant transactions will appear here.
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
export default AdminDashboard;