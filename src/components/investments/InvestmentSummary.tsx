import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { InvestmentSummary as InvestmentSummaryType } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Hash } from "lucide-react";

const fetchInvestmentSummary = async (): Promise<InvestmentSummaryType> => {
  const { data, error } = await supabase.rpc('get_my_investment_summary');
  if (error) throw new Error(error.message);
  return data[0];
};

const InvestmentSummary = () => {
  const { data: summary, isLoading } = useQuery<InvestmentSummaryType>({
    queryKey: ['investmentSummary'],
    queryFn: fetchInvestmentSummary,
  });

  const summaryData = [
    { title: "Total Invested", value: `₹${(summary?.total_invested ?? 0).toLocaleString('en-IN')}`, icon: DollarSign },
    { title: "Active Plans", value: summary?.active_investments_count ?? 0, icon: Hash },
    { title: "Est. Daily Earnings", value: `₹${(summary?.estimated_daily_earnings ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {isLoading ? (
        [...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-1/2" /></CardContent>
          </Card>
        ))
      ) : (
        summaryData.map((item, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default InvestmentSummary;