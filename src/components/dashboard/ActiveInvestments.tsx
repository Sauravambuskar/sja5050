import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserInvestment } from "@/types/database";
import { Progress } from "@/components/ui/progress";
import { differenceInDays, parseISO } from "date-fns";

const fetchActiveInvestments = async (): Promise<any[]> => {
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
    .eq('status', 'Active');
  if (error) throw new Error(error.message);
  return data;
};

export function ActiveInvestments() {
  const { data: investments, isLoading } = useQuery<any[]>({
    queryKey: ['activeInvestments'],
    queryFn: fetchActiveInvestments,
  });

  const calculateProgress = (startDate: string, maturityDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(maturityDate);
    const today = new Date();
    const totalDuration = differenceInDays(end, start);
    const elapsed = differenceInDays(today, start);
    if (totalDuration <= 0) return 100;
    const progress = (elapsed / totalDuration) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Active Investments</CardTitle>
        <CardDescription>A summary of your ongoing investments.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : investments && investments.length > 0 ? (
          <div className="space-y-6">
            {investments.map((inv) => (
              <div key={inv.id}>
                <div className="flex justify-between items-center mb-2">
                  <p className="font-semibold">{inv.investment_plans.name}</p>
                  <p className="font-bold text-lg">₹{inv.investment_amount.toLocaleString()}</p>
                </div>
                <Progress value={calculateProgress(inv.start_date, inv.maturity_date)} />
                <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                  <span>Start: {new Date(inv.start_date).toLocaleDateString()}</span>
                  <span>Maturity: {new Date(inv.maturity_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No active investments found.</p>
        )}
      </CardContent>
    </Card>
  );
}