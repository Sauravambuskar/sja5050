import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ActiveInvestment } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useState } from "react";
import { RequestWithdrawalDialog } from "./RequestWithdrawalDialog";
import { TrendingDown } from "lucide-react";

const fetchActiveInvestments = async (): Promise<ActiveInvestment[]> => {
  const { data, error } = await supabase.rpc('get_my_active_investments_for_withdrawal');
  if (error) throw new Error(error.message);
  return data;
};

export const ActiveInvestmentsForWithdrawal = () => {
  const [selectedInvestment, setSelectedInvestment] = useState<ActiveInvestment | null>(null);
  const { data: investments, isLoading } = useQuery<ActiveInvestment[]>({
    queryKey: ['activeInvestmentsForWithdrawal'],
    queryFn: fetchActiveInvestments,
  });

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!investments || investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50 bg-muted/20 p-8 text-center">
        <TrendingDown className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-4 text-md font-semibold">No Active Investments</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          You do not have any investments eligible for withdrawal.
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Maturity Date</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investments.map((investment) => (
            <TableRow key={investment.id}>
              <TableCell>{investment.plan_name}</TableCell>
              <TableCell>₹{investment.investment_amount.toLocaleString('en-IN')}</TableCell>
              <TableCell>{format(new Date(investment.maturity_date), 'PPP')}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => setSelectedInvestment(investment)}>
                  Request Withdrawal
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {selectedInvestment && (
        <RequestWithdrawalDialog
          investment={selectedInvestment}
          isOpen={!!selectedInvestment}
          onClose={() => setSelectedInvestment(null)}
        />
      )}
    </>
  );
};