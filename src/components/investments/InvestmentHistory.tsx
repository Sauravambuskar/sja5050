import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserInvestment } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { useAuth } from "../auth/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { Progress } from "@/components/ui/progress";
import { Button } from "../ui/button";
import { TrendingUp, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { exportToCsv, exportToPdf } from "@/lib/utils";
import { toast } from "sonner";

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
  const [isExporting, setIsExporting] = useState(false);
  const { data: investments, isLoading, isError, error } = useQuery<UserInvestment[]>({
    queryKey: ['userInvestments', user?.id],
    queryFn: () => fetchUserInvestments(user!.id),
    enabled: !!user,
  });

  const handleExport = async (formatType: 'csv' | 'pdf') => {
    setIsExporting(true);
    toast.info(`Preparing your investment history as a ${formatType.toUpperCase()} file...`);

    try {
      const { data, error } = await supabase.rpc('get_my_full_investment_history');
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.warning("No investment history to export.");
        return;
      }

      const filename = `SJA_Investment_History_${format(new Date(), 'yyyy-MM-dd')}`;
      
      if (formatType === 'csv') {
        exportToCsv(`${filename}.csv`, data.map((item: any) => ({ ...item, event_date: format(new Date(item.event_date), 'yyyy-MM-dd') })));
      } else {
        const title = `Earnings Statement`;
        const headers = ["Date", "Type", "Description", "Amount (INR)"];
        const body = data.map((item: any) => [
          format(new Date(item.event_date), 'PPP'),
          item.event_type,
          item.description,
          item.amount.toLocaleString('en-IN'),
        ]);
        exportToPdf(`${filename}.pdf`, title, headers, body, user?.user_metadata?.full_name || "User");
      }
      toast.success(`Statement exported successfully as ${formatType.toUpperCase()}!`);
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
      <TrendingUp className="mx-auto h-12 w-12" />
      <h3 className="mt-4 text-lg font-semibold text-foreground">No Investments Yet</h3>
      <p className="mt-2 text-sm">
        You haven't made any investments. Explore our plans to get started.
      </p>
      <Button size="sm" className="mt-4" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        View Investment Plans
      </Button>
    </div>
  );

  const renderDesktopView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plan & Amount</TableHead>
          <TableHead>Earnings (Daily / Total)</TableHead>
          <TableHead className="w-[25%]">Progress</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : investments && investments.length > 0 ? (
          investments.map((investment) => {
            const plan = investment.investment_plans?.[0];
            const startDate = new Date(investment.start_date);
            const maturityDate = new Date(investment.maturity_date);
            
            const dailyEarnings = plan && investment.status === 'Active'
              ? (investment.investment_amount * (plan.annual_rate / 100 / 365))
              : null;

            const durationInDays = differenceInDays(maturityDate, startDate);
            const totalProfit = dailyEarnings ? dailyEarnings * durationInDays : 0;
            const totalReturn = investment.investment_amount + totalProfit;

            const today = new Date();
            const totalDuration = maturityDate.getTime() - startDate.getTime();
            const elapsedDuration = today.getTime() - startDate.getTime();
            const progress = totalDuration > 0 ? Math.min(100, (elapsedDuration / totalDuration) * 100) : (investment.status === 'Matured' ? 100 : 0);

            return (
              <TableRow key={investment.id}>
                <TableCell>
                  <div className="font-medium">{plan?.name || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">₹{investment.investment_amount.toLocaleString('en-IN')}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-green-600">
                    {dailyEarnings !== null ? `₹${dailyEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Est. Total: ₹{totalReturn.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </TableCell>
                <TableCell>
                  {investment.status === 'Active' ? (
                    <>
                      <Progress value={progress} className="h-2" />
                      <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                        <span>{format(startDate, "d MMM")}</span>
                        <span>{format(maturityDate, "d MMM yyyy")}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Matured on {format(maturityDate, "PPP")}
                    </div>
                  )}
                </TableCell>
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
            <TableCell colSpan={4}>
              <EmptyState />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading ? (
        [...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24 mt-1" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardContent>
          </Card>
        ))
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
        <EmptyState />
      )}
    </div>
  );

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>My Investment Portfolio</CardTitle>
            <CardDescription>A record of all your active and past investments.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={isExporting} className="gap-1">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting} className="gap-1">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              PDF
            </Button>
          </div>
        </div>
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