import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserInvestment, WithdrawalRequest } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HandCoins, History, Info, Lightbulb, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WithdrawalRequests from "@/components/wallet/WithdrawalRequests";
import { InvestmentCancellation } from "@/components/support/InvestmentCancellation";

type InvestmentWithdrawalRequest = {
  request_id: string;
  plan_name: string;
  requested_amount: number;
  requested_at: string;
  status: string;
  admin_notes: string | null;
  reason: string | null;
};

const withdrawalSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  reason: z.string().min(10, "Please provide a brief reason (min. 10 characters).").max(200, "Reason cannot exceed 200 characters."),
});

const fetchActiveInvestments = async (userId: string): Promise<UserInvestment[]> => {
  const { data, error } = await supabase
    .from('user_investments')
    .select(`*, investment_plans(name)`)
    .eq('user_id', userId)
    .eq('status', 'Active');
  if (error) throw new Error(error.message);
  return data as UserInvestment[];
};

const fetchWithdrawalRequests = async (): Promise<WithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_my_withdrawal_requests', {
    p_request_type: 'Investment',
    p_limit: 100,
    p_offset: 0
  });
  if (error) throw new Error(error.message);
  return data;
};

const requestWithdrawal = async ({ investmentId, amount, reason }: { investmentId: string; amount: number; reason: string }) => {
  const { error } = await supabase.rpc('request_investment_withdrawal', {
    p_investment_id: investmentId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
};

const WithdrawalsPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedInvestment, setSelectedInvestment] = useState<UserInvestment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof withdrawalSchema>>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: 0,
      reason: "",
    },
  });

  const { data: activeInvestments, isLoading: isLoadingInvestments } = useQuery({
    queryKey: ['activeInvestmentsForWithdrawal', user?.id],
    queryFn: () => fetchActiveInvestments(user!.id),
    enabled: !!user,
  });

  const { data: withdrawalRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['myWithdrawalRequests'],
    queryFn: fetchWithdrawalRequests,
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: requestWithdrawal,
    onSuccess: () => {
      toast.success("Withdrawal request submitted successfully.");
      queryClient.invalidateQueries({ queryKey: ['activeInvestmentsForWithdrawal'] });
      queryClient.invalidateQueries({ queryKey: ['myWithdrawalRequests'] });
      setSelectedInvestment(null);
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(`Request failed: ${error.message}`);
    },
  });

  const handleRequestClick = (investment: UserInvestment) => {
    setSelectedInvestment(investment);
    form.reset({ amount: 0, reason: "" });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof withdrawalSchema>) => {
    if (selectedInvestment) {
      if (values.amount > selectedInvestment.investment_amount) {
        form.setError("amount", { type: "manual", message: "Withdrawal amount cannot exceed the investment principal." });
        return;
      }
      mutation.mutate({
        investmentId: selectedInvestment.id,
        amount: values.amount,
        reason: values.reason,
      });
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
            <li>You can request to withdraw any portion of your principal investment before the maturity date.</li>
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
                        <Button size="sm" variant="outline" onClick={() => handleRequestClick(inv)}>Request</Button>
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
                        <p className="font-semibold">{req.details.plan_name}</p>
                        <p className="text-sm text-muted-foreground">Requested: ₹{req.amount.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(req.requested_at), "PPP p")}</p>
                      </div>
                      <Badge variant={req.status === "Approved" || req.status === "Completed" ? "success" : req.status === "Pending" ? "outline" : "destructive"}>
                        {req.status}
                      </Badge>
                    </div>
                    {req.details.reason && (
                      <Alert variant="info" className="mt-3 p-3">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Reason: {req.details.reason}
                        </AlertDescription>
                      </Alert>
                    )}
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
              <p className="text-center text-muted-foreground py-8">No investment withdrawal requests found.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal from {selectedInvestment?.investment_plans?.[0]?.name}</DialogTitle>
            <DialogDescription>
              Principal Amount: ₹{selectedInvestment?.investment_amount.toLocaleString('en-IN')}. Enter the amount you wish to withdraw.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount to Withdraw</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 10000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Withdrawal</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Personal emergency..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WithdrawalsPage;