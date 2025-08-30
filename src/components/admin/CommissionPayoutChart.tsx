import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CommissionPayoutReportData } from "@/types/database";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

const fetchCommissionPayouts = async (): Promise<CommissionPayoutReportData[]> => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const { data, error } = await supabase.rpc('get_commission_payout_report', {
    start_date_filter: format(oneYearAgo, 'yyyy-MM-dd'),
    end_date_filter: null
  });

  if (error) throw new Error(error.message);

  return data.map((item: any) => ({
    ...item,
    month: format(new Date(item.month_start), "MMM yy"),
  }));
};

const chartConfig = {
  total_commission: {
    label: "Commission Paid",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const CommissionPayoutChart = () => {
  const { data: chartData, isLoading } = useQuery<CommissionPayoutReportData[]>({
    queryKey: ['adminCommissionPayoutChart'],
    queryFn: fetchCommissionPayouts,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Payouts (Last 12 Months)</CardTitle>
        <CardDescription>Monthly referral commissions paid out.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis tickFormatter={(value) => `₹${Number(value / 1000).toLocaleString('en-IN')}k`} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="total_commission" fill="var(--color-total_commission)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommissionPayoutChart;