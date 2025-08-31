import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ActiveInvestment } from "@/types/database";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const fetchActiveInvestments = async (): Promise<ActiveInvestment[]> => {
  const { data, error } = await supabase.rpc('get_my_active_investments_for_withdrawal');
  if (error) throw new Error(error.message);
  return data || [];
};

const requestWithdrawal = async (investmentId: string) => {
  const { error } = await supabase.rpc('request_investment_withdrawal', { p_investment_id: investmentId });
  if (error) throw new Error(error.message);
};

export const RequestWithdrawalForm = () => {
  const queryClient = useQueryClient();
  const { data: investments, isLoading, isError, error } = useQuery<ActiveInvestment[]>({
    queryKey: ['myActiveInvestmentsForWithdrawal'],
    queryFn: fetchActiveInvestments,
  });

  const mutation = useMutation({
    mutationFn: requestWithdrawal,
    onSuccess: () => {
      toast.success("Withdrawal request submitted successfully. It is now pending review.");
      queryClient.invalidateQueries({ queryKey: ['myActiveInvestmentsForWithdrawal'] });
      queryClient.invalidateQueries({ queryKey: ['myInvestmentWithdrawalRequests'] });
    },
    onError: (err) => {
      toast.error(`Failed to submit request: ${err.message}`);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Request Investment Withdrawal</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return <p className="text-red-500">Error fetching investments: {error.message}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Investment Withdrawal</CardTitle>
        <CardDescription>
          Select an active investment to request an early withdrawal. Please note that requests are subject to review and approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {investments && investments.length > 0 ? (
          investments.map((investment) => (
            <div key={investment.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-semibold">{investment.plan_name}</p>
                <p className="text-sm text-muted-foreground">
                  Amount: ₹{investment.investment_amount.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Matures on: {format(new Date(investment.maturity_date), 'PPP')}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={mutation.isPending}>Request Withdrawal</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will submit a request to withdraw your investment of ₹{investment.investment_amount.toLocaleString('en-IN')} from the {investment.plan_name} plan. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => mutation.mutate(investment.id)}>
                      {mutation.isPending ? "Submitting..." : "Confirm Request"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No Active Investments</AlertTitle>
            <AlertDescription>
              You do not have any active investments eligible for a withdrawal request.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};