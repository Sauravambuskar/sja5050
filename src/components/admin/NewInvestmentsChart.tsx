import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { NewInvestmentsReportData } from "@/types/database";
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

const fetchNewInvestments = async (): Promise<NewInvestmentsReportData[]> => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const { data, error } = await supabase.rpc('get_new_investments_report', {
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
  total_investment_amount: {
    label: "New Investments",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const NewInvestmentsChart = () => {
  const { data: chartData, isLoading } = useQuery<NewInvestmentsReportData[]>({
    queryKey: ['adminNewInvestmentsChart'],
    queryFn: fetchNewInvestments,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Investment Volume (Last 12 Months)</CardTitle>
        <CardDescription>Monthly volume of new investments.</CardDescription>
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
                <Bar dataKey="total_investment_amount" fill="var(--color-total_investment_amount)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NewInvestmentsChart;