import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { WithdrawalRequest } from "@/types/database";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Info } from "lucide-react";

const withdrawalSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
});

const requestWithdrawal = async (amount: number) => {
  const { error } = await supabase.rpc('request_withdrawal', { request_amount: amount });
  if (error) throw new Error(error.message);
};

const fetchWithdrawalHistory = async (): Promise<WithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_my_withdrawal_requests');
  if (error) throw new Error(error.message);
  return data;
};

const WithdrawalRequests = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const form = useForm<z.infer<typeof withdrawalSchema>>({
    resolver: zodResolver(withdrawalSchema),
  });

  const { data: history, isLoading } = useQuery<WithdrawalRequest[]>({
    queryKey: ['withdrawalHistory'],
    queryFn: fetchWithdrawalHistory,
  });

  const mutation = useMutation({
    mutationFn: requestWithdrawal,
    onSuccess: () => {
      toast.success("Withdrawal request submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ['withdrawalHistory'] });
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      form.reset({ amount: 0 });
    },
    onError: (error) => {
      toast.error(`Request failed: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof withdrawalSchema>) => {
    mutation.mutate(values.amount);
  };

  const renderDesktopHistory = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-24 mt-1" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : history && history.length > 0 ? (
          history.map((req) => (
            <TableRow key={req.id}>
              <TableCell>
                <div className="font-medium">₹{req.amount.toLocaleString('en-IN')}</div>
                <div className="text-sm text-muted-foreground">{format(new Date(req.requested_at), "PPP")}</div>
                {req.status === 'Rejected' && req.admin_notes && (
                  <div className="text-xs text-destructive mt-1">Note: {req.admin_notes}</div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  variant={
                    req.status === "Completed" || req.status === "Approved"
                      ? "default"
                      : req.status === "Pending"
                      ? "outline"
                      : "destructive"
                  }
                >
                  {req.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center">No withdrawal requests yet.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const renderMobileHistory = () => (
    <div className="space-y-4">
      {isLoading ? (
        [...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-start justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-5 w-full" />
            </CardContent>
          </Card>
        ))
      ) : history && history.length > 0 ? (
        history.map((req) => (
          <Card key={req.id}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <CardTitle>₹{req.amount.toLocaleString('en-IN')}</CardTitle>
                <Badge
                  variant={
                    req.status === "Completed" || req.status === "Approved"
                      ? "default"
                      : req.status === "Pending"
                      ? "outline"
                      : "destructive"
                  }
                >
                  {req.status}
                </Badge>
              </div>
              <CardDescription>{format(new Date(req.requested_at), "PPP")}</CardDescription>
            </CardHeader>
            {req.status === 'Rejected' && req.admin_notes && (
              <CardContent className="pb-4">
                <Alert variant="destructive" className="p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Note: {req.admin_notes}
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>
        ))
      ) : (
        <div className="text-center text-muted-foreground p-8 border rounded-lg">
          No withdrawal requests yet.
        </div>
      )}
    </div>
  );

  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Request a Withdrawal</CardTitle>
          <CardDescription>Enter the amount you wish to withdraw from your wallet.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>Your recent withdrawal requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {isMobile ? renderMobileHistory() : renderDesktopHistory()}
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalRequests;