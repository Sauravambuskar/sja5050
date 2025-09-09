import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Landmark, Info, History } from "lucide-react";
import { format } from "date-fns";
import { WithdrawalRequest } from "@/types/database";

type ActiveInvestment = {
  id: string;
  plan_name: string;
  investment_amount: number;
};

const transferSchema = z.object({
  investmentId: z.string().min(1, "Please select an investment."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  reason: z.string().min(10, "A reason of at least 10 characters is required."),
});

const fetchActiveInvestments = async (): Promise<ActiveInvestment[]> => {
  const { data, error } = await supabase.rpc('get_my_active_investments_for_withdrawal');
  if (error) throw new Error(error.message);
  return data;
};

const requestInvestmentWithdrawal = async (values: z.infer<typeof transferSchema>) => {
  const { error } = await supabase.rpc('request_investment_withdrawal', {
    p_investment_id: values.investmentId,
    p_amount: values.amount,
    p_reason: values.reason,
  });
  if (error) throw new Error(error.message);
};

const fetchWithdrawalHistory = async (): Promise<WithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_my_withdrawal_requests', {
    p_request_type: 'Investment',
    p_limit: 100,
    p_offset: 0,
  });
  if (error) throw new Error(error.message);
  return data;
};

const FundTransfer = () => {
  const queryClient = useQueryClient();
  const [selectedInvestment, setSelectedInvestment] = useState<ActiveInvestment | null>(null);
  const form = useForm<z.infer<typeof transferSchema>>({ resolver: zodResolver(transferSchema) });

  const { data: investments, isLoading: isLoadingInvestments } = useQuery({
    queryKey: ['activeInvestmentsForWithdrawal'],
    queryFn: fetchActiveInvestments,
  });

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['investmentWithdrawalHistory'],
    queryFn: fetchWithdrawalHistory,
  });

  const mutation = useMutation({
    mutationFn: requestInvestmentWithdrawal,
    onSuccess: () => {
      toast.success("Withdrawal request submitted successfully.");
      queryClient.invalidateQueries({ queryKey: ['investmentWithdrawalHistory'] });
      form.reset();
      setSelectedInvestment(null);
    },
    onError: (error) => {
      toast.error(`Request failed: ${error.message}`);
    },
  });

  const handleInvestmentChange = (investmentId: string) => {
    const investment = investments?.find(inv => inv.id === investmentId) || null;
    setSelectedInvestment(investment);
    form.setValue("investmentId", investmentId);
  };

  const onSubmit = (values: z.infer<typeof transferSchema>) => {
    if (selectedInvestment && values.amount > selectedInvestment.investment_amount) {
      form.setError("amount", { message: "Withdrawal amount cannot exceed the investment principal." });
      return;
    }
    mutation.mutate(values);
  };

  return (
    <>
      <h1 className="text-3xl font-bold">Fund Transfer to Bank</h1>
      <p className="text-muted-foreground">Request a withdrawal from your active investments. Requests are subject to admin approval.</p>

      <div className="grid gap-6 mt-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New Withdrawal Request</CardTitle>
            <CardDescription>Select an investment and specify the amount to withdraw.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="investmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Investment</FormLabel>
                      <Select onValueChange={handleInvestmentChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger disabled={isLoadingInvestments}>
                            <SelectValue placeholder="Choose an active investment..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {investments?.map(inv => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.plan_name} (Principal: ₹{inv.investment_amount.toLocaleString('en-IN')})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedInvestment && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Investment Principal</AlertTitle>
                    <AlertDescription>
                      ₹{selectedInvestment.investment_amount.toLocaleString('en-IN')}
                    </AlertDescription>
                  </Alert>
                )}
                <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount to Withdraw (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 10000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>Reason for Withdrawal</FormLabel><FormControl><Textarea placeholder="e.g., Personal expenses" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
            <CardDescription>Your past investment withdrawal requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory ? <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="h-6 w-6 animate-spin" /></TableCell></TableRow>
                  : history && history.length > 0 ? (
                    history.map(req => (
                      <TableRow key={req.request_id}>
                        <TableCell>{req.details.plan_name || 'N/A'}</TableCell>
                        <TableCell>₹{req.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell><Badge variant={req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'destructive' : 'default'}>{req.status}</Badge></TableCell>
                        <TableCell>{format(new Date(req.requested_at), 'PP')}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No history found.</TableCell></TableRow>
                  )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default FundTransfer;