import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvestmentPlan } from "@/types/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useState } from "react";

interface InvestDialogProps {
  plan: InvestmentPlan;
  isOpen: boolean;
  onClose: () => void;
}

const requestInvestment = async ({ planId, amount }: { planId: string; amount: number }) => {
  const { error } = await supabase.rpc("request_investment", {
    p_plan_id: planId,
    p_amount: amount,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const InvestDialog = ({ plan, isOpen, onClose }: InvestDialogProps) => {
  const [amount, setAmount] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: requestInvestment,
    onSuccess: () => {
      toast.success("Investment request submitted successfully!", {
        description: "An admin will review your request shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["userInvestmentRequests"] }); // A new query key for user to see their requests
      onClose();
    },
    onError: (error) => {
      toast.error(`Request failed: ${error.message}`);
    },
  });

  const handleQuickSelect = (value: number) => {
    setAmount(String(value));
  };

  const handleSubmit = () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Please enter a valid investment amount.");
      return;
    }
    if (numericAmount < plan.min_investment) {
      toast.error(`Amount must be at least ₹${plan.min_investment.toLocaleString()}`);
      return;
    }
    if (plan.max_investment && numericAmount > plan.max_investment) {
      toast.error(`Amount cannot exceed ₹${plan.max_investment.toLocaleString()}`);
      return;
    }
    mutation.mutate({ planId: plan.id, amount: numericAmount });
  };

  const monthlyRate = plan.annual_rate / 12;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Investment in {plan.name}</DialogTitle>
          <DialogDescription>
            Return: {monthlyRate.toFixed(2)}% monthly.
            Investment Range: ₹{plan.min_investment.toLocaleString('en-IN')} - ₹{plan.max_investment?.toLocaleString('en-IN') ?? 'Unlimited'}.
            <br />
            Your request will be sent to an admin for approval.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount (₹)
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder={`e.g., ${plan.min_investment}`}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-start-2 col-span-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect(plan.min_investment)}>Min</Button>
              {plan.max_investment && <Button variant="outline" size="sm" onClick={() => handleQuickSelect(plan.max_investment as number)}>Max</Button>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};