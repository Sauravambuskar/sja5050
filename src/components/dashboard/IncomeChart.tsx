import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { IncomeHistoryReportData } from "@/types/database";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

const fetchIncomeHistory = async (): Promise<IncomeHistoryReportData[]> => {
  const { data, error } = await supabase.rpc('get_my_income_history_report');
  if (error) throw new Error(error.message);
  return data.map((item: IncomeHistoryReportData) => ({
    ...item,
    day: format(new Date(item.report_date), "d MMM"),
  }));
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="col-span-2 font-bold">{label}</div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: 'hsl(var(--primary))' }} />
            Total
          </div>
          <div className="text-right font-mono">₹{payload[0].value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="flex items-center text-muted-foreground">
            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
            Investments
          </div>
          <div className="text-right font-mono text-muted-foreground">₹{payload[1].value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="flex items-center text-muted-foreground">
            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
            Commissions
          </div>
          <div className="text-right font-mono text-muted-foreground">₹{payload[2].value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(value) => `₹${value}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="total_income" name="Total Income" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="investment_income" name="Investments" stroke="hsl(var(--chart-1))" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="commission_income" name="Commissions" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IncomeChart;