import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { IncomeHistoryReportData } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

const fetchIncomeHistory = async (): Promise<IncomeHistoryReportData[]> => {
  const { data, error } = await supabase.rpc('get_my_income_history_report');
  if (error) throw new Error(error.message);
  return data.map((item: { report_date: string; total_income: number; }) => ({
    ...item,
    day: format(new Date(item.report_date), "d MMM"),
  }));
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
        <CardDescription>Your daily income over the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(value) => `₹${value}`} />
                <Tooltip
                  formatter={(value) => `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="total_income" name="Daily Income" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IncomeChart;