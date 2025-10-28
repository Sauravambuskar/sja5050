import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, Users, ArrowRightLeft, Wallet, PiggyBank, Gift, Landmark } from "lucide-react";
import { DashboardStats, Transaction, Profile, ExtendedDashboardStats } from "@/types/database";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { MyInvestments } from "@/components/dashboard/MyInvestments";
import PortfolioPie from "@/components/dashboard/PortfolioPie";

interface DashboardProps {
  stats: DashboardStats;
  extendedStats: ExtendedDashboardStats;
  transactions: Transaction[];
  profile: Profile;
}

const Dashboard = ({ stats, extendedStats, transactions, profile }: DashboardProps) => {
  const isMobile = useIsMobile();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'Deposit':
      case 'Commission':
      case 'Investment Payout':
      case 'Wallet Adjustment':
        return <ArrowDownToLine className="h-5 w-5 text-green-500" />;
      case 'Withdrawal':
      case 'Investment':
        return <ArrowUpFromLine className="h-5 w-5 text-red-500" />;
      default:
        return <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTransactionAmountClass = (type: string, amount: number) => {
    if (['Deposit', 'Commission', 'Investment Payout'].includes(type)) return 'text-green-600';
    if (['Withdrawal', 'Investment'].includes(type)) return 'text-destructive';
    if (type === 'Wallet Adjustment') return amount > 0 ? 'text-green-600' : 'text-destructive';
    return '';
  };

  const getTransactionAmountPrefix = (type: string, amount: number) => {
    if (['Deposit', 'Commission', 'Investment Payout'].includes(type)) return '+';
    if (['Withdrawal', 'Investment'].includes(type)) return '-';
    if (type === 'Wallet Adjustment') return amount > 0 ? '+' : '';
    return '';
  };

  const summaryStats = [
    { title: "Wallet Balance", value: stats.walletBalance, icon: Wallet, color: "text-blue-500" },
    { title: "Active Investments", value: stats.totalInvested, icon: PiggyBank, color: "text-green-500" },
    { title: "Investment Returns", value: extendedStats.total_investment_return, icon: Landmark, color: "text-purple-500" },
    { title: "Referral Commission", value: extendedStats.total_referral_commission, icon: Gift, color: "text-pink-500" },
  ];

  const quickActions = [
    { title: "Deposit", icon: ArrowDownToLine, link: "/wallet?tab=deposit" },
    { title: "Withdraw", icon: ArrowUpFromLine, link: "/wallet?tab=withdraw" },
    { title: "Invest", icon: TrendingUp, link: "/investments" },
    { title: "Referrals", icon: Users, link: "/referrals" },
  ];

  const renderDesktopTransactions = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px] text-center">Type</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions && transactions.length > 0 ? (
          transactions.map((txn) => (
            <TableRow key={txn.id}>
              <TableCell>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {getTransactionIcon(txn.type)}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{txn.description || txn.type}</div>
                <div className="text-sm text-muted-foreground">{format(new Date(txn.created_at), "PPP")}</div>
              </TableCell>
              <TableCell className={cn("text-right font-semibold", getTransactionAmountClass(txn.type, txn.amount))}>
                {getTransactionAmountPrefix(txn.type, txn.amount)} ₹{Math.abs(txn.amount).toLocaleString('en-IN')}
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
  );

  const renderMobileTransactions = () => (
    <div className="space-y-0">
      {transactions && transactions.length > 0 ? (
        transactions.map((txn) => (
          <div key={txn.id} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
              {getTransactionIcon(txn.type)}
            </div>
            <div className="flex-grow space-y-0.5">
              <div className="font-medium">{txn.description || txn.type}</div>
              <div className="text-xs text-muted-foreground">{format(new Date(txn.created_at), "PPP")}</div>
            </div>
            <div className={cn("text-right font-semibold", getTransactionAmountClass(txn.type, txn.amount))}>
              {getTransactionAmountPrefix(txn.type, txn.amount)} ₹{Math.abs(txn.amount).toLocaleString('en-IN')}
            </div>
          </div>
        ))
      ) : (
        <div className="flex h-24 items-center justify-center text-center text-muted-foreground">No recent transactions.</div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{getGreeting()}, {profile?.full_name?.split(' ')[0] || 'User'}!</h1>
        <p className="text-muted-foreground">Welcome to your dashboard.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {summaryStats.map((item) => (
            <div key={item.title} className="flex items-center gap-4 rounded-lg border p-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-muted ${item.color}`}>
                <item.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.title}</p>
                <p className="text-2xl font-bold">
                  ₹{(item.value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4 text-center">
        {quickActions.map((action) => (
          <Link key={action.title} to={action.link} className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-primary/5 hover:bg-primary/10">
              <action.icon className="h-6 w-6 text-primary" />
            </Button>
            <span className="text-xs font-medium">{action.title}</span>
          </Link>
        ))}
      </div>

      <MyInvestments />

      <div className="grid gap-6 md:grid-cols-2">
        <PortfolioPie />
        {/* You can keep other dashboard widgets here */}
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isMobile ? renderMobileTransactions() : renderDesktopTransactions()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;