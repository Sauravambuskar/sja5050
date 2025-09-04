import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { IncomeHistoryReportData } from "@/types/database";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import React from "react";

const fetchIncomeHistory = async (): Promise<IncomeHistoryReportData[]> => {
  const { data, error } = await supabase.rpc('get_my_income_history_report');
  if (error) throw new Error(error.message);
  return data.map((item: IncomeHistoryReportData) => ({
    ...item,
    day: format(new Date(item.report_date), "d MMM"),
  }));
};

const chartConfig = {
  total_income: {
    label: "Total Income",
    color: "hsl(var(--primary))",
  },
  investment_income: {
    label: "Investments",
    color: "hsl(var(--chart-1))",
  },
  commission_income: {
    label: "Commissions",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const totalIncomeData = payload.find((p: any) => p.dataKey === 'total_income');
    const investmentIncomeData = payload.find((p: any) => p.dataKey === 'investment_income');
    const commissionIncomeData = payload.find((p: any) => p.dataKey === 'commission_income');

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="col-span-2 font-bold">{label}</div>
          
          {totalIncomeData && (
            <>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: totalIncomeData.color }} />
                Total
              </div>
              <div className="text-right font-mono">₹{totalIncomeData.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </>
          )}

          {investmentIncomeData && (
            <>
              <div className="flex items-center text-muted-foreground">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: investmentIncomeData.color }} />
                Investments
              </div>
              <div className="text-right font-mono text-muted-foreground">₹{investmentIncomeData.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </>
          )}

          {commissionIncomeData && (
            <>
              <div className="flex items-center text-muted-foreground">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: commissionIncomeData.color }} />
                Commissions
              </div>
              <div className="text-right font-mono text-muted-foreground">₹{commissionIncomeData.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const IncomeChart = () => {
  const { data: chartData, isLoading } = useQuery<IncomeHistoryReportData[]>({
    queryKey: ['incomeHistoryReport'],
    queryFn: fetchIncomeHistory,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>30-Day Income Trend</CardTitle>
        <CardDescription>Your daily income from all sources over the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickFormatter={(value) => `₹${value}`} />
                <ChartTooltip content={<CustomTooltip />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="total_income" stroke="var(--color-total_income)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="investment_income" stroke="var(--color-investment_income)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="commission_income" stroke="var(--color-commission_income)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IncomeChart;