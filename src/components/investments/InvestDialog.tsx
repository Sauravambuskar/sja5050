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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useState } from "react";
import { Skeleton } from "../ui/skeleton";

interface InvestDialogProps {
  plan: InvestmentPlan;
  isOpen: boolean;
  onClose: () => void;
}

const fetchWalletBalance = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('get_my_wallet_balance');
  if (error) throw new Error(error.message);
  return data;
};

const invest = async ({ planId, amount }: { planId: string; amount: number }) => {
  const { data, error } = await supabase.rpc("invest_in_plan", {
    plan_id_to_invest: planId,
    investment_amount_to_invest: amount,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const InvestDialog = ({ plan, isOpen, onClose }: InvestDialogProps) => {
  const [amount, setAmount] = useState("");
  const queryClient = useQueryClient();

  const { data: walletBalance, isLoading: isBalanceLoading } = useQuery<number>({
    queryKey: ['walletBalance'],
    queryFn: fetchWalletBalance,
    enabled: isOpen, // Only fetch when the dialog is open
  });

  const mutation = useMutation({
    mutationFn: invest,
    onSuccess: () => {
      toast.success("Investment successful!");
      queryClient.invalidateQueries({ queryKey: ["userInvestments"] });
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
      onClose();
    },
    onError: (error) => {
      toast.error(`Investment failed: ${error.message}`);
    },
  });

  const handleQuickSelect = (type: 'min' | 'half' | 'max') => {
    if (walletBalance === undefined) return;
    let calculatedAmount = 0;
    switch (type) {
      case 'min':
        calculatedAmount = plan.min_investment;
        break;
      case 'half':
        calculatedAmount = walletBalance / 2;
        break;
      case 'max':
        calculatedAmount = walletBalance;
        break;
    }
    setAmount(String(Math.floor(calculatedAmount)));
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
    if (walletBalance !== undefined && numericAmount > walletBalance) {
      toast.error("Investment amount cannot exceed your wallet balance.");
      return;
    }
    mutation.mutate({ planId: plan.id, amount: numericAmount });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invest in {plan.name}</DialogTitle>
          <DialogDescription>
            Investment Range: ₹{plan.min_investment.toLocaleString('en-IN')} - ₹{plan.max_investment?.toLocaleString('en-IN') ?? 'Unlimited'}.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          Available to invest: 
          {isBalanceLoading ? (
            <Skeleton className="inline-block h-4 w-20 ml-1" />
          ) : (
            <span className="font-semibold text-foreground ml-1">
              ₹{walletBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
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
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect('min')}>Min</Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect('half')} disabled={walletBalance === undefined}>50%</Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect('max')} disabled={walletBalance === undefined}>Max</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Investing..." : "Confirm Investment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};