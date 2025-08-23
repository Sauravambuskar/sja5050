import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CommissionStats, CommissionHistoryItem } from "@/types/database";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";

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

const CommissionAnalytics = () => {
  const { data: stats, isLoading: statsLoading } = useQuery<CommissionStats>({
    queryKey: ['commissionStats'],
    queryFn: fetchCommissionStats,
  });

  const { data: history, isLoading: historyLoading } = useQuery<CommissionHistoryItem[]>({
    queryKey: ['commissionHistory'],
    queryFn: fetchCommissionHistory,
  });

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
          <h3 className="text-lg font-medium">Commission History</h3>
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
        </div>
      </CardContent>
    </Card>
  );
};

export default CommissionAnalytics;