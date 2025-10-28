import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AdminUserInvestmentHistoryItem } from "@/types/database";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";

interface ReduceInvestmentDialogProps {
  investment: AdminUserInvestmentHistoryItem | null;
  userId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const reduceInvestmentSchema = z.object({
  reductionAmount: z.coerce.number().positive({ message: "Reduction amount must be positive." }),
  notes: z.string().min(10, { message: "Notes must be at least 10 characters long." }),
});

const reduceInvestment = async ({ investmentId, reductionAmount, notes }: { investmentId: string; reductionAmount: number; notes: string }) => {
  const { error } = await supabase.rpc('admin_reduce_investment_amount', {
    p_investment_id: investmentId,
    p_reduction_amount: reductionAmount,
    p_notes: notes,
  });
  if (error) throw new Error(error.message);
};

export const ReduceInvestmentDialog = ({ investment, userId, isOpen, onOpenChange }: ReduceInvestmentDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof reduceInvestmentSchema>>({
    resolver: zodResolver(reduceInvestmentSchema),
    defaultValues: {
      reductionAmount: 0,
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: reduceInvestment,
    onSuccess: () => {
      toast.success("Investment amount reduced successfully.");
      queryClient.invalidateQueries({ queryKey: ['userInvestmentHistory', userId] });
      queryClient.invalidateQueries({ queryKey: ['userTransactions', userId] });
      queryClient.invalidateQueries({ queryKey: ['userDetails', userId] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(`Failed to reduce amount: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof reduceInvestmentSchema>) => {
    if (!investment) return;
    if (values.reductionAmount > investment.investment_amount) {
      form.setError("reductionAmount", { message: "Cannot reduce more than the principal amount." });
      return;
    }
    mutation.mutate({
      investmentId: investment.id,
      reductionAmount: values.reductionAmount,
      notes: values.notes,
    });
  };

  if (!investment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reduce Investment Amount</DialogTitle>
          <DialogDescription>Manually reduce the principal amount for an active investment. The reduced amount will be processed as a withdrawal and will appear in the user's withdrawal history (no wallet credit).</DialogDescription>
        </DialogHeader>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>{investment.plan_name}</AlertTitle>
          <AlertDescription>
            Current Principal: ₹{investment.investment_amount.toLocaleString('en-IN')}
          </AlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reductionAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount to Reduce (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 5000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason / Notes for Reduction</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Explain why this reduction is being made..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Reduction
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};