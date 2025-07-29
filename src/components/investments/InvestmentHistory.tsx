import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserInvestment } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAuth } from "../auth/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { Progress } from "@/components/ui/progress";

const fetchUserInvestments = async (userId: string): Promise<UserInvestment[]> => {
  const { data, error } = await supabase
    .from('user_investments')
    .select(`
      id,
      investment_amount,
      start_date,
      maturity_date,
      status,
      investment_plans ( name, annual_rate )
    `)
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data as UserInvestment[];
};

const InvestmentHistory = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { data: investments, isLoading, isError, error } = useQuery<UserInvestment[]>({
    queryKey: ['userInvestments', user?.id],
    queryFn: () => fetchUserInvestments(user!.id),
    enabled: !!user,
  });

  const renderDesktopView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plan Name</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Daily Earnings</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>Maturity Date</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-28" /></TableCell>
              <TableCell><Skeleton className="h-5 w-28" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : investments && investments.length > 0 ? (
          investments.map((investment) => {
            const plan = investment.investment_plans?.[0];
            const dailyEarnings = plan && investment.status === 'Active'
              ? (investment.investment_amount * (plan.annual_rate / 100 / 365))
              : null;

            return (
              <TableRow key={investment.id}>
                <TableCell className="font-medium">{plan?.name || 'N/A'}</TableCell>
                <TableCell>₹{investment.investment_amount.toLocaleString('en-IN')}</TableCell>
                <TableCell className="text-green-600 font-medium">
                  {dailyEarnings !== null ? `₹${dailyEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </TableCell>
                <TableCell>{format(new Date(investment.start_date), "PPP")}</TableCell>
                <TableCell>{format(new Date(investment.maturity_date), "PPP")}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={investment.status === "Active" ? "default" : "secondary"}>
                    {investment.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
              You have no investments yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading ? (
        [...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)
      ) : investments && investments.length > 0 ? (
        investments.map((investment) => {
          const plan = investment.investment_plans?.[0];
          const dailyEarnings = plan && investment.status === 'Active'
            ? (investment.investment_amount * (plan.annual_rate / 100 / 365))
            : null;
          
          const startDate = new Date(investment.start_date);
          const maturityDate = new Date(investment.maturity_date);
          const today = new Date();
          const totalDuration = maturityDate.getTime() - startDate.getTime();
          const elapsedDuration = today.getTime() - startDate.getTime();
          const progress = totalDuration > 0 ? Math.min(100, (elapsedDuration / totalDuration) * 100) : 0;

          return (
            <Card key={investment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{plan?.name || 'N/A'}</CardTitle>
                    <CardDescription>Invested: {format(startDate, "PPP")}</CardDescription>
                  </div>
                  <Badge variant={investment.status === "Active" ? "default" : "secondary"}>
                    {investment.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">₹{investment.investment_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily Earnings</span>
                  <span className="font-medium text-green-600">
                    {dailyEarnings !== null ? `₹${dailyEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </span>
                </div>
                {investment.status === 'Active' && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>Matures: {format(maturityDate, "PPP")}</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      ) : (
        <div className="text-center text-muted-foreground p-8">
          You have no investments yet.
        </div>
      )}
    </div>
  );

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>My Investment Portfolio</CardTitle>
        <CardDescription>A record of all your active and past investments.</CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="text-center text-red-500">Error: {error.message}</div>
        ) : isMobile ? renderMobileView() : renderDesktopView()}
      </CardContent>
    </Card>
  );
};

export default InvestmentHistory;