import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { NewInvestmentsReportData } from "@/types/database";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${Number(value / 1000).toLocaleString('en-IN')}k`} />
                <Tooltip
                  formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Bar dataKey="total_investment_amount" name="New Investments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NewInvestmentsChart;