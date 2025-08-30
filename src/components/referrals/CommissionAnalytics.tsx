import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CommissionStats, CommissionHistoryItem } from "@/types/database";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type CommissionHistoryReportData = {
  report_date: string;
  commission_income: number;
  day: string;
};

const fetchCommissionStats = async (): Promise<CommissionStats> => {
  const { data, error } = await supabase.rpc('get_my_commission_stats');
  if (error) throw new Error(error.message);
  return data[0];
};

const fetchCommissionHistory = async (): Promise<CommissionHistoryItem[]> => {
  const { data, error } = await supabase.rpc('get_my_commission_history');
  if (error) throw new Error(error.message);
  return data;
};

const fetchCommissionHistoryReport = async (): Promise<CommissionHistoryReportData[]> => {
  const { data, error } = await supabase.rpc('get_my_commission_history_report');
  if (error) throw new Error(error.message);
  return data.map((item: any) => ({
    ...item,
    day: format(new Date(item.report_date), "d MMM"),
  }));
};

const chartConfig = {
  commission_income: {
    label: "Commission Earned",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const CommissionAnalytics = () => {
  const isMobile = useIsMobile();
  const { data: stats, isLoading: statsLoading } = useQuery<CommissionStats>({
    queryKey: ['commissionStats'],
    queryFn: fetchCommissionStats,
  });

  const { data: history, isLoading: historyLoading } = useQuery<CommissionHistoryItem[]>({
    queryKey: ['commissionHistory'],
    queryFn: fetchCommissionHistory,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery<CommissionHistoryReportData[]>({
    queryKey: ['commissionHistoryReport'],
    queryFn: fetchCommissionHistoryReport,
  });

  const renderDesktopHistory = () => (
    <div className="mt-4 rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>From User</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {historyLoading ? (
            [...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-6 w-12 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : history && history.length > 0 ? (
            history.map((commission) => (
              <TableRow key={commission.id}>
                <TableCell className="font-medium">{commission.from_user_name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">Lvl {commission.level}</Badge>
                </TableCell>
                <TableCell>₹{commission.amount.toLocaleString('en-IN')}</TableCell>
                <TableCell>{format(new Date(commission.payout_date), "PPP")}</TableCell>
                <TableCell className="text-right">
                  <Badge>Paid</Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">No commission history yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderMobileHistory = () => (
    <div className="mt-4 space-y-4">
      {historyLoading ? (
        [...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-32 mt-1" />
              </div>
              <Skeleton className="h-6 w-12" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </CardContent>
          </Card>
        ))
      ) : history && history.length > 0 ? (
        history.map((commission) => (
          <Card key={commission.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>₹{commission.amount.toLocaleString('en-IN')}</CardTitle>
                <CardDescription>From: {commission.from_user_name}</CardDescription>
              </div>
              <Badge>Paid</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{format(new Date(commission.payout_date), "PPP")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Level</span>
                <Badge variant="secondary">Lvl {commission.level}</Badge>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center text-muted-foreground p-8 border rounded-lg">
          No commission history yet.
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Analytics</CardTitle>
        <CardDescription>An overview of your referral earnings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commission Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-3/4" />
              ) : (
                <div className="text-2xl font-bold">₹{(stats?.total_commission_earned ?? 0).toLocaleString('en-IN')}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-1/4" />
              ) : (
                <div className="text-2xl font-bold">{stats?.total_referrals ?? 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-lg font-medium">30-Day Commission Trend</h3>
          <div className="h-[250px] w-full mt-2">
            {chartLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis tickFormatter={(value) => `₹${value}`} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />}
                  />
                  <Bar dataKey="commission_income" fill="var(--color-commission_income)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium">Commission History</h3>
          {isMobile ? renderMobileHistory() : renderDesktopHistory()}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommissionAnalytics;