import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { WithdrawalRequest } from "@/types/database";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";

const withdrawalSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
});

const fetchWithdrawalHistory = async (): Promise<WithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_my_withdrawal_requests');
  if (error) throw new Error(error.message);
  return data;
};

const submitWithdrawalRequest = async (amount: number) => {
  const { error } = await supabase.rpc('request_withdrawal', { amount_to_withdraw: amount });
  if (error) throw new Error(error.message);
};

const WithdrawalRequests = () => {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof withdrawalSchema>>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: undefined,
    }
  });

  const { data: history, isLoading } = useQuery<WithdrawalRequest[]>({
    queryKey: ['withdrawalHistory'],
    queryFn: fetchWithdrawalHistory,
  });

  const mutation = useMutation({
    mutationFn: submitWithdrawalRequest,
    onSuccess: () => {
      toast.success("Withdrawal request submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ['withdrawalHistory'] });
      form.reset({ amount: undefined });
    },
    onError: (error) => {
      toast.error(`Request failed: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof withdrawalSchema>) => {
    mutation.mutate(values.amount);
  };

  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Request a Withdrawal</CardTitle>
          <CardDescription>Enter the amount you wish to withdraw from your wallet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>Your recent withdrawal requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : history && history.length > 0 ? (
                history.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">₹{req.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>{format(new Date(req.created_at), "PPP")}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          req.status === "Approved"
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
                  <TableCell colSpan={3} className="h-24 text-center">No withdrawal requests found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalRequests;