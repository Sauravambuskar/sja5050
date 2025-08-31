import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ActiveInvestment } from "@/types/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { Alert, AlertDescription } from "../ui/alert";
import { Input } from "../ui/input";

interface RequestWithdrawalDialogProps {
  investment: ActiveInvestment;
  isOpen: boolean;
  onClose: () => void;
}

const submitWithdrawalRequest = async ({ investmentId, amount, reason }: { investmentId: string; amount: number; reason: string }) => {
  // Defensive check: Ensure amount is a valid number. If NaN, treat as 0 to avoid NULL constraint violation.
  // The backend function will then reject 0 with a more specific error.
  const safeAmount = isNaN(amount) ? 0 : amount;

  const { error } = await supabase.rpc("request_investment_withdrawal", {
    p_investment_id: investmentId,
    p_amount: safeAmount,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const RequestWithdrawalDialog = ({ investment, isOpen, onClose }: RequestWithdrawalDialogProps) => {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [consent, setConsent] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: submitWithdrawalRequest,
    onSuccess: () => {
      toast.success("Withdrawal request submitted successfully!", {
        description: "An admin will review your request shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["myInvestmentWithdrawalRequests"] });
      queryClient.invalidateQueries({ queryKey: ["activeInvestmentsForWithdrawal"] });
      onClose();
    },
    onError: (error) => {
      toast.error(`Request failed: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast.error("Please enter a valid, positive withdrawal amount.");
      return;
    }
    if (withdrawalAmount > investment.investment_amount) {
      toast.error(`Amount cannot exceed the investment principal of ₹${investment.investment_amount.toLocaleString('en-IN')}.`);
      return;
    }
    if (reason.trim().length < 10) {
      toast.error("Please provide a valid reason (at least 10 characters).");
      return;
    }
    if (!consent) {
      toast.error("You must consent to the terms of early withdrawal.");
      return;
    }
    mutation.mutate({ investmentId: investment.id, amount: withdrawalAmount, reason });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Withdrawal for {investment.plan_name}</DialogTitle>
          <DialogDescription>
            Your current principal in this investment is ₹{investment.investment_amount.toLocaleString('en-IN')}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Early withdrawal may result in the forfeiture of any profits earned. Only the principal amount will be returned to your wallet upon approval.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Withdraw (Required)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`e.g., 5000`}
              max={investment.investment_amount}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Withdrawal (Required)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you need to withdraw this investment early..."
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="consent" checked={consent} onCheckedChange={(checked) => setConsent(checked as boolean)} />
            <label htmlFor="consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I understand and agree to the early withdrawal terms.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || !consent || reason.trim().length < 10 || !amount}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};