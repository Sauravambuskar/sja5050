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
import { useState, useRef } from "react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Banknote, Loader2 } from "lucide-react";

interface InvestDialogProps {
  plan: InvestmentPlan;
  isOpen: boolean;
  onClose: () => void;
}

const requestInvestment = async ({ planId, amount, referenceId, screenshotPath }: { planId: string; amount: number; referenceId: string; screenshotPath: string; }) => {
  const { error } = await supabase.rpc("request_investment", {
    p_plan_id: planId,
    p_amount: amount,
    p_reference_id: referenceId,
    p_screenshot_path: screenshotPath,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const InvestDialog = ({ plan, isOpen, onClose }: InvestDialogProps) => {
  const [amount, setAmount] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { settings, isLoading: isLoadingSettings } = useSystemSettings();

  const mutation = useMutation({
    mutationFn: requestInvestment,
    onSuccess: () => {
      toast.success("Investment request submitted successfully!", {
        description: "An admin will review your request shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["userInvestmentRequests"] });
      onClose();
    },
    onError: (error) => {
      toast.error(`Request failed: ${error.message}`);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File size cannot exceed 5MB.");
        return;
      }
      setScreenshotFile(file);
    }
  };

  const handleSubmit = async () => {
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
    if (!referenceId.trim()) {
      toast.error("Please enter the transaction reference ID.");
      return;
    }
    if (!screenshotFile) {
      toast.error("Please upload a payment screenshot.");
      return;
    }

    try {
      // 1. Upload screenshot
      const fileExt = screenshotFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('deposit_proofs')
        .upload(filePath, screenshotFile);

      if (uploadError) {
        throw new Error(`Screenshot upload failed: ${uploadError.message}`);
      }

      // 2. Call RPC
      mutation.mutate({
        planId: plan.id,
        amount: numericAmount,
        referenceId: referenceId.trim(),
        screenshotPath: filePath,
      });

    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const monthlyRate = plan.annual_rate / 12;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invest in {plan.name}</DialogTitle>
          <DialogDescription>
            Complete the payment and submit the form below to request your investment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <Alert>
            <Banknote className="h-4 w-4" />
            <AlertTitle>Step 1: Complete Payment</AlertTitle>
            <AlertDescription>
              {isLoadingSettings && <p>Loading bank details...</p>}
              {settings?.company_bank_details ? (
                <div className="text-sm mt-2 space-y-1">
                  <p><strong>Bank:</strong> {settings.company_bank_details.bank_name}</p>
                  <p><strong>Account Name:</strong> {settings.company_bank_details.account_holder_name}</p>
                  <p><strong>Account No:</strong> {settings.company_bank_details.account_number}</p>
                  <p><strong>IFSC:</strong> {settings.company_bank_details.ifsc_code}</p>
                  <p><strong>UPI ID:</strong> {settings.company_bank_details.upi_id}</p>
                </div>
              ) : (
                <p>Company bank details are not configured. Please contact support.</p>
              )}
            </AlertDescription>
          </Alert>

          <div>
            <h3 className="font-semibold mb-4">Step 2: Submit Your Request</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount (₹)</Label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-3" placeholder={`Min ₹${plan.min_investment.toLocaleString()}`} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="referenceId" className="text-right">Reference ID</Label>
                <Input id="referenceId" value={referenceId} onChange={(e) => setReferenceId(e.target.value)} className="col-span-3" placeholder="e.g., UTR from bank app" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="screenshot" className="text-right">Screenshot</Label>
                <div className="col-span-3">
                  <Input id="screenshot" type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg" className="hidden" />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    {screenshotFile ? "Change File" : "Choose File"}
                  </Button>
                  {screenshotFile && <span className="ml-3 text-sm text-muted-foreground">{screenshotFile.name}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || !settings?.company_bank_details}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mutation.isPending ? "Submitting..." : "Submit Investment Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};