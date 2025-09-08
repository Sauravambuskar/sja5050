import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserInvestment, UserInvestmentCancellationRequest } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileWarning, History, Info, Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { format } from "date-fns";
import { Badge } from "../ui/badge";

const cancellationSchema = z.object({
  investmentId: z.string().uuid({ message: "Please select a valid investment." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  reason: z.string().min(20, "Reason must be at least 20 characters.").max(500, "Reason cannot exceed 500 characters."),
});

const fetchActiveInvestments = async (userId: string): Promise<UserInvestment[]> => {
  const { data, error } = await supabase.from('user_investments').select(`id, investment_amount, investment_plans(name)`).eq('user_id', userId).eq('status', 'Active');
  if (error) throw new Error(error.message);
  return data as any[];
};

const fetchCancellationHistory = async (): Promise<UserInvestmentCancellationRequest[]> => {
  const { data, error } = await supabase.rpc('get_my_investment_cancellation_requests');
  if (error) throw new Error(error.message);
  return data;
};

const requestCancellation = async (values: z.infer<typeof cancellationSchema>) => {
  const { error } = await supabase.rpc('request_investment_cancellation', {
    p_investment_id: values.investmentId,
    p_cancellation_amount: values.amount,
    p_reason: values.reason,
  });
  if (error) throw new Error(error.message);
};

export const InvestmentCancellation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const form = useForm<z.infer<typeof cancellationSchema>>({ resolver: zodResolver(cancellationSchema) });
  const selectedInvestmentId = form.watch("investmentId");

  const { data: activeInvestments, isLoading: isLoadingInvestments } = useQuery({
    queryKey: ['activeInvestmentsForCancellation', user?.id],
    queryFn: () => fetchActiveInvestments(user!.id),
    enabled: !!user,
  });

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['investmentCancellationHistory', user?.id],
    queryFn: fetchCancellationHistory,
    enabled: !!user,
  });

  const selectedInvestment = activeInvestments?.find(inv => inv.id === selectedInvestmentId);

  const mutation = useMutation({
    mutationFn: requestCancellation,
    onSuccess: () => {
      toast.success("Cancellation request submitted successfully.");
      queryClient.invalidateQueries({ queryKey: ['investmentCancellationHistory'] });
      queryClient.invalidateQueries({ queryKey: ['activeInvestmentsForCancellation'] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(`Request failed: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof cancellationSchema>) => {
    if (selectedInvestment && values.amount > selectedInvestment.investment_amount) {
      form.setError("amount", { type: "manual", message: "Amount cannot exceed the investment principal." });
      return;
    }
    mutation.mutate(values);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Request Investment Cancellation</CardTitle>
          <CardDescription>Submit a formal request to cancel an active investment.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">If you need to access your funds before maturity, you can request a cancellation here. All requests are subject to review.</p>
          <Button onClick={() => setIsDialogOpen(true)} className="w-full">
            <FileWarning className="mr-2 h-4 w-4" />
            Create New Cancellation Request
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History />
            <CardTitle>Cancellation Request History</CardTitle>
          </div>
          <CardDescription>A log of your investment cancellation requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : history && history.length > 0 ? (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {history.map(req => (
                <div key={req.request_id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{req.plan_name}</p>
                      <p className="text-sm text-muted-foreground">Requested: ₹{req.cancellation_amount.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(req.requested_at), "PPP p")}</p>
                    </div>
                    <Badge variant={req.status === "Approved" ? "success" : req.status === "Pending" ? "outline" : "destructive"}>{req.status}</Badge>
                  </div>
                  {req.status === 'Rejected' && req.admin_notes && (
                    <Alert variant="destructive" className="mt-2 p-2 text-xs"><Info className="h-4 w-4" />{req.admin_notes}</Alert>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No cancellation requests found.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Investment Cancellation Request</DialogTitle>
            <DialogDescription>Complete the form below. Please read the disclaimer carefully before submitting.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="investmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Investment to Cancel</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger disabled={isLoadingInvestments}>
                          <SelectValue placeholder={isLoadingInvestments ? "Loading investments..." : "Select an active investment"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeInvestments?.map(inv => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.investment_plans?.[0]?.name} (Principal: ₹{inv.investment_amount.toLocaleString('en-IN')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount to Withdraw (₹)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 10000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Cancellation</FormLabel>
                    <FormControl><Textarea placeholder="Please explain why you need to cancel this investment..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Alert variant="destructive">
                <FileWarning className="h-4 w-4" />
                <AlertTitle>Disclaimer</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 text-xs">
                    <li>By submitting this request, you understand that you are breaking the terms of the original investment agreement.</li>
                    <li>All requests are subject to admin approval and are not guaranteed.</li>
                    <li>Processing may take up to 5-7 business days.</li>
                  </ul>
                </AlertDescription>
              </Alert>
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
    </div>
  );
};