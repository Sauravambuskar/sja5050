import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CreditCard, DollarSign, Users, ArrowRightLeft, ArrowDown, ArrowUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DashboardStats, Transaction } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DailyIncome from "@/components/dashboard/DailyIncome";
import IncomeChart from "@/components/dashboard/IncomeChart";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'Deposit':
        return <ArrowDown className="h-4 w-4 text-green-500" />;
      case 'Withdrawal':
        return <ArrowUp className="h-4 w-4 text-red-500" />;
      case 'Investment':
        return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
      case 'Commission':
        return <ArrowDown className="h-4 w-4 text-green-500" />;
      default:
        return <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionAmountClass = (type: string) => {
    switch (type) {
      case 'Deposit':
      case 'Commission':
        return 'text-green-600';
      case 'Withdrawal':
      case 'Investment':
        return 'text-destructive';
      default:
        return '';
    }
  };

  const getTransactionAmountPrefix = (type: string) => {
    switch (type) {
      case 'Deposit':
      case 'Commission':
        return '+';
      case 'Withdrawal':
      case 'Investment':
        return '-';
      default:
        return '';
    }
  };

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
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{(stats?.walletBalance ?? 0).toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground">Available to invest</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stats && stats.activeInvestments > 0 ? (
                  <>
                    <div className="text-2xl font-bold">{stats.activeInvestments}</div>
                    <p className="text-xs text-muted-foreground">Currently growing</p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">Get Started</div>
                    <p className="text-xs text-muted-foreground">Make your first investment</p>
                    <Button asChild size="sm" className="mt-2">
                      <Link to="/investments">Browse Plans</Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.referralCount ?? 0}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.kycStatus || 'Not Submitted'}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.kycStatus === 'Approved' ? 'Your account is verified' : 'Verification required'}
                </p>
                {stats?.kycStatus !== 'Approved' && (
                  <Button asChild size="sm" className="mt-2">
                    <Link to="/profile?tab=kyc">Complete KYC</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DailyIncome />
        <IncomeChart />
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
                          {getTransactionIcon(txn.type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{txn.description || txn.type}</div>
                        <div className="text-sm text-muted-foreground">{format(new Date(txn.created_at), "PPP")}</div>
                      </TableCell>
                      <TableCell className={cn("text-right font-semibold", getTransactionAmountClass(txn.type))}>
                        {getTransactionAmountPrefix(txn.type)} ₹{txn.amount.toLocaleString('en-IN')}
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