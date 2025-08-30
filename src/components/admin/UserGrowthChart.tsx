import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserGrowthReportData } from "@/types/database";
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

const fetchUserGrowth = async (): Promise<UserGrowthReportData[]> => {
  // Fetch data for the last 12 months for the dashboard view
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const { data, error } = await supabase.rpc('get_user_growth_report', {
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
  user_count: {
    label: "New Users",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const UserGrowthChart = () => {
  const { data: chartData, isLoading } = useQuery<UserGrowthReportData[]>({
    queryKey: ['adminUserGrowthChart'],
    queryFn: fetchUserGrowth,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Growth (Last 12 Months)</CardTitle>
        <CardDescription>Monthly new user registrations.</CardDescription>
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
                <YAxis allowDecimals={false} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="user_count" fill="var(--color-user_count)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserGrowthChart;