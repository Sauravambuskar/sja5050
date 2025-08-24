import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserInvestment } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HandCoins, History, Info, Lightbulb, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type InvestmentWithdrawalRequest = {
  request_id: string;
  plan_name: string;
  investment_amount: number;
  requested_at: string;
  status: string;
  admin_notes: string | null;
};

const fetchActiveInvestments = async (userId: string): Promise<UserInvestment[]> => {
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
    .eq('status', 'Active');
  if (error) throw new Error(error.message);
  return data as UserInvestment[];
};

const fetchWithdrawalRequests = async (): Promise<InvestmentWithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_my_investment_withdrawal_requests');
  if (error) throw new Error(error.message);
  return data;
};

const requestWithdrawal = async (investmentId: string) => {
  const { error } = await supabase.rpc('request_investment_withdrawal', { p_investment_id: investmentId });
  if (error) throw new Error(error.message);
};

const Withdrawals = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedInvestment, setSelectedInvestment] = useState<UserInvestment | null>(null);

  const { data: activeInvestments, isLoading: isLoadingInvestments } = useQuery({
    queryKey: ['activeInvestmentsForWithdrawal', user?.id],
    queryFn: () => fetchActiveInvestments(user!.id),
    enabled: !!user,
  });

  const { data: withdrawalRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['myInvestmentWithdrawalRequests'],
    queryFn: fetchWithdrawalRequests,
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: requestWithdrawal,
    onSuccess: () => {
      toast.success("Withdrawal request submitted successfully.");
      queryClient.invalidateQueries({ queryKey: ['activeInvestmentsForWithdrawal'] });
      queryClient.invalidateQueries({ queryKey: ['myInvestmentWithdrawalRequests'] });
      setSelectedInvestment(null);
    },
    onError: (error) => {
      toast.error(`Request failed: ${error.message}`);
    },
  });

  const handleRequestClick = (investment: UserInvestment) => {
    setSelectedInvestment(investment);
  };

  const handleConfirmRequest = () => {
    if (selectedInvestment) {
      mutation.mutate(selectedInvestment.id);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Investment Withdrawals</h1>
      </div>
      <p className="text-muted-foreground">
        Request to withdraw active investments and track your request history.
      </p>

      <Alert className="mt-6">
        <Lightbulb className="h-4 w-4" />
        <AlertTitle>Please Note</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 space-y-1">
            <li>All withdrawal requests are subject to admin approval and may take 2-3 business days to process.</li>
            <li>Withdrawing an investment before its maturity date may result in forfeiture of accrued profits. The principal amount will be returned to your wallet.</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 mt-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HandCoins />
              <CardTitle>Request Investment Withdrawal</CardTitle>
            </div>
            <CardDescription>
              You can request to withdraw an active investment. This will move the principal amount to your wallet upon approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investment</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingInvestments ? (
                  <TableRow><TableCell colSpan={2} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                ) : activeInvestments && activeInvestments.length > 0 ? (
                  activeInvestments.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div className="font-medium">{inv.investment_plans?.[0]?.name}</div>
                        <div className="text-sm text-muted-foreground">₹{inv.investment_amount.toLocaleString('en-IN')}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => handleRequestClick(inv)}>Request</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm Withdrawal Request</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to request to withdraw your investment of ₹{selectedInvestment?.investment_amount.toLocaleString('en-IN')} in the {selectedInvestment?.investment_plans?.[0]?.name} plan? The principal amount will be returned to your wallet if approved.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleConfirmRequest} disabled={mutation.isPending}>
                                {mutation.isPending ? <Loader2 className="animate-spin" /> : "Confirm Request"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={2} className="text-center h-24">No active investments to withdraw.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History />
              <CardTitle>Withdrawal Request History</CardTitle>
            </div>
            <CardDescription>A log of your investment withdrawal requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRequests ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : withdrawalRequests && withdrawalRequests.length > 0 ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {withdrawalRequests.map(req => (
                  <div key={req.request_id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{req.plan_name}</p>
                        <p className="text-sm text-muted-foreground">₹{req.investment_amount.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(req.requested_at), "PPP p")}</p>
                      </div>
                      <Badge variant={req.status === "Approved" ? "success" : req.status === "Pending" ? "outline" : "destructive"}>
                        {req.status}
                      </Badge>
                    </div>
                    {req.status === 'Rejected' && req.admin_notes && (
                      <Alert variant="destructive" className="mt-3 p-3">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Note: {req.admin_notes}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No withdrawal requests found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Withdrawals;