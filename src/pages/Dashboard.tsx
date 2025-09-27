import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { DashboardStats as DashboardStatsType } from "@/types/database";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { ActiveInvestments } from "@/components/dashboard/ActiveInvestments";
import { KycStatusAlert } from "@/components/dashboard/KycStatusAlert";
import { ReferralCard } from "@/components/dashboard/ReferralCard";
import { BannerCarousel } from "@/components/dashboard/BannerCarousel";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

const fetchDashboardStats = async (userId: string): Promise<DashboardStatsType | null> => {
  if (!userId) return null;
  const { data, error } = await supabase
    .rpc('get_dashboard_stats')
    .single();
  if (error) throw new Error(error.message);
  return data as DashboardStatsType;
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboardStats', user?.id],
    queryFn: () => fetchDashboardStats(user!.id),
    enabled: !!user,
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{getGreeting()}, {stats?.fullName || 'User'}!</h1>
            <p className="text-muted-foreground">
              Here's a summary of your portfolio and activities.
            </p>
          </div>
          <div className="hidden md:block">
            <Link to="/investments">
              <Button>
                New Investment <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="my-6">
          <BannerCarousel />
        </div>

        <KycStatusAlert kycStatus={stats?.kycStatus} />

        <DashboardStats stats={stats as DashboardStatsType} isLoading={isLoading} />

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActiveInvestments />
          </div>
          <div>
            <RecentTransactions />
          </div>
        </div>
        
        <ReferralCard />
      </div>
    </div>
  );
}