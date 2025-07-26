import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserGrowthReportData, CommissionPayoutReportData } from "@/types/database";

type ReportType = 'user_growth' | 'commission_payouts';

const fetchUserGrowthReport = async (): Promise<UserGrowthReportData[]> => {
  const { data, error } = await supabase.rpc('get_user_growth_report');
  if (error) throw new Error(error.message);
  return data.map((item: { month_start: string; user_count: number; }) => ({
    ...item,
    month: format(new Date(item.month_start), "MMM yyyy"),
  }));
};

const fetchCommissionPayoutReport = async (): Promise<CommissionPayoutReportData[]> => {
  const { data, error } = await supabase.rpc('get_commission_payout_report');
  if (error) throw new Error(error.message);
  return data.map((item: { month_start: string; total_commission: number; }) => ({
    ...item,
    month: format(new Date(item.month_start), "MMM yyyy"),
  }));
};

const Reporting = () => {
  const [reportType, setReportType] = React.useState<ReportType>('user_growth');
  const [startDate, setStartDate] = React.useState<Date>();
  const [endDate, setEndDate] = React.useState<Date>();

  const { data: reportData, isLoading: isReportLoading } = useQuery({
    queryKey: ['adminReport', reportType],
    queryFn: () => {
      if (reportType === 'user_growth') {
        return fetchUserGrowthReport();
      }
      if (reportType === 'commission_payouts') {
        return fetchCommissionPayoutReport();
      }
      return Promise.resolve([]);
    },
  });

  const chartConfig = {
    user_growth: { dataKey: 'user_count', name: 'New Users', unit: '' },
    commission_payouts: { dataKey: 'total_commission', name: 'Commission Paid', unit: '₹' },
  };

  const currentChartConfig = chartConfig[reportType];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reporting</h1>
          <p className="text-muted-foreground">Generate custom reports and export data.</p>
        </div>
        <Button variant="outline" className="gap-1">
          <Download className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Export Data
          </span>
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Report Generator</CardTitle>
          <CardDescription>Select your criteria to generate a new report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user_growth">User Growth</SelectItem>
                <SelectItem value="commission_payouts">Commission Payouts</SelectItem>
                <SelectItem value="aum" disabled>AUM Growth (soon)</SelectItem>
                <SelectItem value="investments" disabled>New Investments (soon)</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  disabled
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  disabled
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="h-[350px] w-full rounded-lg border p-4">
            <ResponsiveContainer width="100%" height="100%">
              {isReportLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <BarChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${currentChartConfig.unit}${value}`} />
                  <Tooltip
                    formatter={(value) => `${currentChartConfig.unit}${Number(value).toLocaleString()}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey={currentChartConfig.dataKey} name={currentChartConfig.name} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
export default Reporting;