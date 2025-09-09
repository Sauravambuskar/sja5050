import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AdminUserView } from "@/types/database";

const adjustmentSchema = z.object({
  amount: z.coerce.number().refine(val => val !== 0, { message: "Amount cannot be zero." }),
  description: z.string().min(5, "Description must be at least 5 characters."),
});

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

const adjustWallet = async ({ userId, amount, description }: { userId: string; amount: number; description: string }) => {
  const { data, error } = await supabase.functions.invoke('admin-adjust-wallet', { body: { userId, amount, description } });
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

interface AdminWalletAdjustmentTabProps {
  userId: string;
  user: AdminUserView;
}

export const AdminWalletAdjustmentTab = ({ userId, user }: AdminWalletAdjustmentTabProps) => {
  const queryClient = useQueryClient();
  const [adjustmentDetails, setAdjustmentDetails] = useState<AdjustmentFormValues | null>(null);
  const adjustmentForm = useForm<AdjustmentFormValues>({ resolver: zodResolver(adjustmentSchema), defaultValues: { amount: 0, description: "" } });

  const adjustmentMutation = useMutation({
    mutationFn: adjustWallet,
    onSuccess: () => {
      toast.success("Wallet adjusted successfully!");
      queryClient.invalidateQueries({ queryKey: ['userDetails', userId] });
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });
      queryClient.invalidateQueries({ queryKey: ['userTransactionHistory', userId] });
      adjustmentForm.reset();
      setAdjustmentDetails(null);
    },
    onError: (error) => { toast.error(`Adjustment failed: ${error.message}`); setAdjustmentDetails(null); },
  });

  const onAdjustmentSubmit = (values: AdjustmentFormValues) => setAdjustmentDetails(values);
  const handleConfirmAdjustment = () => { if (!userId || !adjustmentDetails) return; adjustmentMutation.mutate({ userId, amount: adjustmentDetails.amount, description: adjustmentDetails.description }); };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Manual Wallet Adjustment</CardTitle>
          <CardDescription>Credit or debit the user's wallet. Use a negative value for debits.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...adjustmentForm}>
            <form onSubmit={adjustmentForm.handleSubmit(onAdjustmentSubmit)} className="space-y-4">
              <FormField control={adjustmentForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={adjustmentForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Reason / Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" disabled={adjustmentMutation.isPending}>Submit Adjustment</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <AlertDialog open={!!adjustmentDetails} onOpenChange={(isOpen) => !isOpen && setAdjustmentDetails(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Wallet Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {adjustmentDetails?.amount ?? 0 > 0 ? 'credit' : 'debit'} the wallet for <span className="font-semibold">{user?.full_name}</span> by <span className="font-semibold">₹{Math.abs(adjustmentDetails?.amount ?? 0).toLocaleString()}</span>.<br />Reason: "{adjustmentDetails?.description}"<br /><br />Are you sure you want to proceed? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAdjustment} disabled={adjustmentMutation.isPending}>
              {adjustmentMutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};