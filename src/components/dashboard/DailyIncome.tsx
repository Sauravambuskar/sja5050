import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DailyIncomeStats } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Gift } from "lucide-react";

const fetchDailyIncomeStats = async (): Promise<DailyIncomeStats> => {
  const { data, error } = await supabase.rpc('get_my_daily_income_stats');
  if (error) throw new Error(error.message);
  return data[0];
};

const DailyIncome = () => {
  const { data: stats, isLoading } = useQuery<DailyIncomeStats>({
    queryKey: ['dailyIncomeStats'],
    queryFn: fetchDailyIncomeStats,
  });

  const totalIncome = (stats?.today_investment_income ?? 0) + (stats?.today_commission_income ?? 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Estimated Income</CardTitle>
        <CardDescription>Total earnings from investments and commissions today.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-4xl font-bold">
          {isLoading ? <Skeleton className="h-10 w-3/4" /> : `₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
            <span>Investments</span>
          </div>
          {isLoading ? <Skeleton className="h-5 w-16" /> : <span>₹{(stats?.today_investment_income ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <Gift className="mr-2 h-4 w-4 text-blue-500" />
            <span>Commissions</span>
          </div>
          {isLoading ? <Skeleton className="h-5 w-16" /> : <span>₹{(stats?.today_commission_income ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyIncome;