import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { format } from "date-fns";

const transferSchema = z.object({
  recipientMemberId: z.string().min(1, "Recipient Member ID is required."),
  amount: z.coerce.number().positive("Amount must be positive."),
  notes: z.string().optional(),
});

const requestTransfer = async (values: z.infer<typeof transferSchema>) => {
  const { error } = await supabase.rpc('request_balance_transfer', {
    p_recipient_member_id: values.recipientMemberId,
    p_amount: values.amount,
    p_sender_notes: values.notes,
  });
  if (error) throw new Error(error.message);
};

const fetchMyTransfers = async () => {
  const { data, error } = await supabase.rpc('get_my_balance_transfers');
  if (error) throw new Error(error.message);
  return data;
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Approved': return 'success';
    case 'Pending': return 'default';
    case 'Rejected': return 'destructive';
    default: return 'secondary';
  }
};

export const BalanceTransfer = () => {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof transferSchema>>({ resolver: zodResolver(transferSchema) });

  const { data: transfers, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['myBalanceTransfers'],
    queryFn: fetchMyTransfers,
  });

  const mutation = useMutation({
    mutationFn: requestTransfer,
    onSuccess: () => {
      toast.success("Transfer request submitted successfully.");
      queryClient.invalidateQueries({ queryKey: ['myBalanceTransfers'] });
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      form.reset();
    },
    onError: (error) => {
      toast.error(`Transfer failed: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof transferSchema>) => {
    mutation.mutate(values);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>New Balance Transfer</CardTitle>
          <CardDescription>Send funds to another member. Requests require admin approval.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="recipientMemberId" render={({ field }) => (<FormItem><FormLabel>Recipient Member ID</FormLabel><FormControl><Input placeholder="e.g., SJA-00123" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 1000" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Reason for transfer..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Request Transfer
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
          <CardDescription>Your history of sent and received transfers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>To/From</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingHistory ? (
                <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : transfers && transfers.length > 0 ? (
                transfers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {t.type === 'Sent' ? <ArrowUp className="h-4 w-4 text-red-500" /> : <ArrowDown className="h-4 w-4 text-green-500" />}
                    </TableCell>
                    <TableCell>{t.other_party_name}</TableCell>
                    <TableCell>₹{t.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(t.status)}>{t.status}</Badge></TableCell>
                    <TableCell>{format(new Date(t.requested_at), 'PP')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No transfers found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};