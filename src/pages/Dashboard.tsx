import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CreditCard, DollarSign, Users, ArrowRightLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DashboardStats, Transaction } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error) throw new Error(error.message);
  // The RPC returns an array with one object, so we extract it.
  return data[0];
};

const fetchRecentTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase.rpc('get_my_transactions');
  if (error) throw new Error(error.message);
  return data.slice(0, 5); // Get top 5 recent transactions
};

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['recentTransactions'],
    queryFn: fetchRecentTransactions,
  });

  const kpiData = [
    { title: "Wallet Balance", value: `₹${(stats?.walletBalance ?? 0).toLocaleString('en-IN')}`, icon: DollarSign, change: "Available to invest" },
    { title: "Active Investments", value: stats?.activeInvestments ?? 0, icon: Activity, change: "Currently growing" },
    { title: "New Referrals", value: "0", icon: Users, change: "this month" },
    { title: "KYC Status", value: "Pending", icon: CreditCard, change: "needs review" },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        {statsLoading ? (
          <Skeleton className="h-9 w-1/2" />
        ) : (
          <h1 className="text-3xl font-bold">Welcome, {stats?.fullName || 'User'}!</h1>
        )}
      </div>
      <p className="text-muted-foreground">
        Here's a summary of your portfolio and activities.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          [...Array(4)].map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-2/3 mt-1" /></CardContent></Card>)
        ) : (
          kpiData.map((kpi, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">{kpi.change}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-bold">Recent Transactions</h2>
        <Card className="mt-4">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center hidden sm:table-cell">Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions && transactions.length > 0 ? (
                  transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{txn.type}</div>
                        <div className="text-sm text-muted-foreground">{format(new Date(txn.created_at), "PPP")}</div>
                      </TableCell>
                      <TableCell className={cn("text-right font-semibold", txn.type === 'Investment' ? 'text-destructive' : 'text-green-600')}>
                        {txn.type === 'Investment' ? '-' : '+'} ₹{txn.amount.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">No recent transactions.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Dashboard;