import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, UserCheck, Hourglass, ArrowDownToDot, TrendingUp, CalendarClock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminDashboardStats } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import UserGrowthChart from "@/components/admin/UserGrowthChart";
import AumGrowthChart from "@/components/admin/AumGrowthChart";
import CommissionPayoutChart from "@/components/admin/CommissionPayoutChart";
import NewInvestmentsChart from "@/components/admin/NewInvestmentsChart";
import { Link } from "react-router-dom";
import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import { HighValueTransactions } from "@/components/admin/HighValueTransactions";
import { BirthdayList } from "@/components/admin/BirthdayList";

const fetchAdminStats = async (): Promise<AdminDashboardStats> => {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
  if (error) throw new Error(error.message);
  return data[0];
};

const AdminDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminDashboardStats>({
    queryKey: ['adminDashboardStats'],
    queryFn: fetchAdminStats,
  });

  const kpiData = stats ? [
    { title: "Total Users", value: stats.total_users.toLocaleString(), icon: Users, to: "/admin/users" },
    { title: "Assets Under Management", value: `₹${stats.aum.toLocaleString('en-IN')}`, icon: DollarSign, to: "/admin/investments" },
    { title: "This Month's Payout Projection", value: `₹${stats.monthly_payout_projection.toLocaleString('en-IN')}`, icon: CalendarClock, to: "/admin/payout-reports" },
    { title: "Pending Investments", value: `${stats.pending_investments_count} (₹${stats.pending_investments_value.toLocaleString('en-IN')})`, icon: TrendingUp, to: "/admin/investment-requests" },
  ] : [];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of platform KPIs and activities.</p>
        </div>
      </div>
      
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statsLoading ? (
          [...Array(4)].map((_, i) => (
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminActivityFeed />
        </div>
        <div className="space-y-6">
          <BirthdayList />
          <HighValueTransactions />
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <UserGrowthChart />
        <AumGrowthChart />
        <NewInvestmentsChart />
        <CommissionPayoutChart />
      </div>
    </>
  );
};
export default AdminDashboard;