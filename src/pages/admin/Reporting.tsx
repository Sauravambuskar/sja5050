import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Download, Loader2 } from "lucide-react";
import { cn, exportToCsv } from "@/lib/utils";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserGrowthReportData, CommissionPayoutReportData, NewInvestmentsReportData, AumGrowthReportData } from "@/types/database";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

type ReportType = 'user_growth' | 'commission_payouts' | 'new_investments' | 'aum_growth';
type ReportData = (UserGrowthReportData | CommissionPayoutReportData | NewInvestmentsReportData | AumGrowthReportData)[];

const fetchReportData = async (reportType: ReportType, startDate?: Date, endDate?: Date): Promise<ReportData> => {
  let rpcName: string;
  switch (reportType) {
    case 'user_growth':
      rpcName = 'get_user_growth_report';
      break;
    case 'commission_payouts':
      rpcName = 'get_commission_payout_report';
      break;
    case 'new_investments':
      rpcName = 'get_new_investments_report';
      break;
    case 'aum_growth':
      rpcName = 'get_aum_growth_report';
      break;
    default:
      throw new Error('Invalid report type');
  }

  const params = {
    start_date_filter: startDate ? format(startDate, 'yyyy-MM-dd') : null,
    end_date_filter: endDate ? format(endDate, 'yyyy-MM-dd') : null,
  };

  const { data, error } = await supabase.rpc(rpcName, params);
  if (error) throw new Error(error.message);

  return data.map((item: any) => ({
    ...item,
    month: format(new Date(item.month_start), "MMM yyyy"),
  }));
};

const Reporting = () => {
  const [reportType, setReportType] = React.useState<ReportType>('user_growth');
  const [date, setDate] = React.useState<DateRange | undefined>();

  const { data: reportData, isLoading: isReportLoading } = useQuery({
    queryKey: ['adminReport', reportType, date?.from, date?.to],
    queryFn: () => fetchReportData(reportType, date?.from, date?.to),
  });

  const chartConfig = {
    user_growth: { dataKey: 'user_count', name: 'New Users', unit: '' },
    commission_payouts: { dataKey: 'total_commission', name: 'Commission Paid', unit: '₹' },
    new_investments: { dataKey: 'total_investment_amount', name: 'New Investment Volume', unit: '₹' },
    aum_growth: { dataKey: 'total_aum', name: 'Assets Under Management', unit: '₹' },
  };

  const currentChartConfig = chartConfig[reportType];

  const handleExport = () => {
    if (!reportData || reportData.length === 0) {
      toast.warning("No data available to export.");
      return;
    }
    const filename = `${reportType}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    exportToCsv(filename, reportData as object[]);
    toast.success("Report exported successfully.");
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reporting</h1>
          <p className="text-muted-foreground">Generate custom reports and export data.</p>
        </div>
        <Button variant="outline" className="gap-1" onClick={handleExport} disabled={isReportLoading}>
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
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user_growth">User Growth</SelectItem>
                <SelectItem value="commission_payouts">Commission Payouts</SelectItem>
                <SelectItem value="new_investments">New Investments</SelectItem>
                <SelectItem value="aum_growth">AUM Growth</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker date={date} onDateChange={setDate} />
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
          <div className="mt-6">
            <h3 className="text-lg font-medium">Report Data</h3>
            <div className="mt-2 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">{currentChartConfig.name}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isReportLoading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : reportData && reportData.length > 0 ? (
                    reportData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{(row as any).month}</TableCell>
                        <TableCell className="text-right">
                          {currentChartConfig.unit}
                          {(row as any)[currentChartConfig.dataKey].toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center">
                        No data for the selected criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
export default Reporting;