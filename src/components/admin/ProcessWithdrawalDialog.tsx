import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AdminWithdrawalRequest } from "@/types/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ProcessWithdrawalDialogProps {
  request: AdminWithdrawalRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

const processRequest = async ({
  requestId,
  status,
  notes,
}: {
  requestId: string;
  status: "Completed" | "Rejected";
  notes: string;
}) => {
  const { data, error } = await supabase.rpc("process_withdrawal_request", {
    request_id_to_process: requestId,
    new_status: status,
    notes: notes,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const ProcessWithdrawalDialog = ({
  request,
  isOpen,
  onClose,
}: ProcessWithdrawalDialogProps) => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  
  const mutation = useMutation({
    mutationFn: processRequest,
    onSuccess: (data) => {
      toast.success(data || "Request processed successfully.");
      queryClient.invalidateQueries({ queryKey: ["adminWithdrawalRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminWithdrawalRequestsCount"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboardStats"] });
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to process request: ${error.message}`);
    },
  });

  useEffect(() => {
    if (request) {
      setNotes(request.admin_notes || "");
    }
  }, [request]);

  const handleSubmit = (status: "Completed" | "Rejected") => {
    if (!request) return;
    if (status === "Rejected" && !notes.trim()) {
      toast.error("Please provide a reason for rejection in the notes.");
      return;
    }
    mutation.mutate({ requestId: request.request_id, status, notes });
  };

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Process Withdrawal Request</DialogTitle>
          <DialogDescription>
            Review the details and approve or reject the request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-sm">
          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            <div className="font-medium text-muted-foreground col-span-1">User</div>
            <div className="col-span-2">{request.user_name} ({request.user_email})</div>
            
            <div className="font-medium text-muted-foreground col-span-1">Amount</div>
            <div className="col-span-2 font-semibold">₹{request.amount.toLocaleString("en-IN")}</div>

            <div className="font-medium text-muted-foreground col-span-1">Wallet Balance</div>
            <div className="col-span-2">₹{request.wallet_balance.toLocaleString("en-IN")}</div>

            <div className="font-medium text-muted-foreground col-span-1">Requested At</div>
            <div className="col-span-2">{format(new Date(request.requested_at), "PPP p")}</div>
            
            <div className="font-medium text-muted-foreground col-span-1">Bank Holder</div>
            <div className="col-span-2">{request.bank_account_holder_name || 'N/A'}</div>

            <div className="font-medium text-muted-foreground col-span-1">Bank Account</div>
            <div className="col-span-2">{request.bank_account_number || 'N/A'}</div>

            <div className="font-medium text-muted-foreground col-span-1">IFSC Code</div>
            <div className="col-span-2">{request.bank_ifsc_code || 'N/A'}</div>
          </div>
          <div>
            <label htmlFor="notes" className="font-medium">
              Admin Notes (Required for rejection)
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Insufficient details provided."
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => handleSubmit("Rejected")}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
            <Button
              variant="success"
              onClick={() => handleSubmit("Completed")}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};