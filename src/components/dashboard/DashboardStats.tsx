import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Landmark, Users, Wallet } from "lucide-react";
import { DashboardStats as DashboardStatsType } from "@/types/database";

interface DashboardStatsProps {
  stats: DashboardStatsType | null;
  isLoading: boolean;
}

const StatCard = ({ title, value, icon: Icon, loading }: { title: string; value: string; icon: React.ElementType; loading: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-3/4" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Invested"
        value={`₹${(stats?.totalInvested || 0).toLocaleString()}`}
        icon={DollarSign}
        loading={isLoading}
      />
      <StatCard
        title="Active Investments"
        value={String(stats?.activeInvestmentsCount || 0)}
        icon={Landmark}
        loading={isLoading}
      />
      <StatCard
        title="Referrals"
        value={String(stats?.referralCount || 0)}
        icon={Users}
        loading={isLoading}
      />
      <StatCard
        title="Wallet Balance"
        value={`₹${(stats?.walletBalance || 0).toLocaleString()}`}
        icon={Wallet}
        loading={isLoading}
      />
    </div>
  );
}