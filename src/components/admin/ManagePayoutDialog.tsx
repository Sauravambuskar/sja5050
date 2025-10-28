import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LedgerItem } from "@/pages/admin/Ledger";
import { format } from "date-fns";
import { useEffect } from "react";

const formSchema = z.object({
  status: z.string().min(1, "Status is required."),
  paid_amount: z.coerce.number().optional(),
  payment_mode: z.string().optional(),
  remarks: z.string().optional(),
});

interface ManagePayoutDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  payout: LedgerItem | null;
  month: Date;
}

export const ManagePayoutDialog = ({ isOpen, onOpenChange, payout, month }: ManagePayoutDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "Pending",
      paid_amount: 0,
      payment_mode: "",
      remarks: "",
    },
  });

  useEffect(() => {
    if (payout) {
      form.reset({
        status: payout.payout_status || "Pending",
        paid_amount: payout.paid_amount || payout.accrued_in_period,
        payment_mode: "", // This can be fetched if stored
        remarks: payout.payout_remarks || "",
      });
    }
  }, [payout, form]);

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!payout) throw new Error("No payout selected");

      const { error } = await supabase.rpc("record_payout", {
        p_investment_id: payout.investment_id,
        p_payout_month: format(month, "yyyy-MM-01"),
        p_status: values.status,
        p_paid_amount: values.status === 'Paid' ? values.paid_amount : null,
        p_payment_mode: values.payment_mode,
        p_remarks: values.remarks,
      });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      // Refresh all relevant views
      queryClient.invalidateQueries({ queryKey: ["adminLedger"] });
      queryClient.invalidateQueries({ queryKey: ["adminPayoutHistory"] });
      queryClient.invalidateQueries({ queryKey: ["myPayoutHistory"] });

      // If Paid, surface the receipt link (PDF ready via the receipt page)
      if (variables.status === "Paid" && payout) {
        const linkMonth = format(month, "yyyy-MM");
        const receiptUrl = `/admin/receipts/payout/${payout.investment_id}/${linkMonth}`;
        toast.success("Payout marked as Paid. Receipt is ready.", {
          action: {
            label: "View Receipt",
            onClick: () => window.open(receiptUrl, "_blank"),
          },
        });
      } else {
        toast.success("Payout status updated successfully.");
      }

      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Error updating status: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values);
  };

  if (!payout) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Payout for {payout.user_name}</DialogTitle>
          <DialogDescription>
            Update the payment status for the investment in {payout.plan_name} for {format(month, "MMMM yyyy")}.
            <br />
            Accrued Amount: <strong>₹{payout.accrued_in_period.toLocaleString('en-IN')}</strong>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch("status") === "Paid" && (
              <>
                <FormField
                  control={form.control}
                  name="paid_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Paid</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter amount paid" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="payment_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Mode</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Bank Transfer, UPI" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks / Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any relevant notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};