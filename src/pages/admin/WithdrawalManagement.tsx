import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, XCircle, Eye, AlertTriangle, Download } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminWithdrawalRequest } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { exportToCsv } from "@/lib/utils";

const fetchWithdrawalRequests = async (): Promise<AdminWithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_all_withdrawal_requests');
  if (error) throw new Error(error.message);
  return data;
};

const processRequest = async ({ requestId, status, notes }: { requestId: string; status: 'Completed' | 'Rejected'; notes: string }) => {
  const { data, error } = await supabase.rpc('process_withdrawal_request', {
    request_id_to_process: requestId,
    new_status: status,
    notes: notes,
  });
  if (error) throw new Error(error.message);
  return data;
};

const sendWithdrawalEmail = async ({ to, name, amount, status, notes }: { to: string; name: string; amount: number; status: string; notes: string }) => {
  const subject = `Your Withdrawal Request has been ${status}`;
  const html = status === 'Completed'
    ? `<p>Hi ${name},</p><p>Your withdrawal request for ₹${amount.toLocaleString('en-IN')} has been successfully processed.</p><p>Thank you for choosing SJA Foundation.</p>`
    : `<p>Hi ${name},</p><p>Your withdrawal request for ₹${amount.toLocaleString('en-IN')} has been rejected.</p><p>Reason: ${notes}</p><p>Please contact support if you have any questions.</p>`;

  const { error } = await supabase.functions.invoke('send-transactional-email', { body: { to, subject, html } });
  if (error) {
    console.error("Failed to send withdrawal email:", error);
    toast.warning("Withdrawal processed, but the confirmation email could not be sent.");
  }
};

const WithdrawalManagement = () => {
  const queryClient = useQueryClient();
  const [detailsRequest, setDetailsRequest] = useState<AdminWithdrawalRequest | null>(null);
  const [actionToConfirm, setActionToConfirm] = useState<{ request: AdminWithdrawalRequest; status: 'Completed' | 'Rejected' } | null>(null);

  const { data: requests, isLoading, isError, error } = useQuery<AdminWithdrawalRequest[]>({
    queryKey: ['allWithdrawalRequests'],
    queryFn: fetchWithdrawalRequests,
  });

  const mutation = useMutation({
    mutationFn: processRequest,
    onSuccess: (data, variables) => {
      toast.success(`Request has been ${variables.status.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['allWithdrawalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });

      if (actionToConfirm) {
        sendWithdrawalEmail({
          to: actionToConfirm.request.user_email,
          name: actionToConfirm.request.user_name,
          amount: actionToConfirm.request.amount,
          status: variables.status,
          notes: variables.notes,
        });
      }
    },
    onError: (error) => {
      toast.error(`Action failed: ${error.message}`);
    },
    onSettled: () => {
      setActionToConfirm(null);
    }
  });

  const handleProcessRequest = (request: AdminWithdrawalRequest, status: 'Completed' | 'Rejected') => {
    const notes = status === 'Completed' ? 'Approved by admin.' : 'Rejected by admin.';
    mutation.mutate({ requestId: request.request_id, status, notes });
  };

  const handleExport = () => {
    if (!requests || requests.length === 0) {
      toast.warning("No withdrawal data to export.");
      return;
    }
    const dataToExport = requests.map(req => ({
      RequestID: req.request_id,
      UserName: req.user_name,
      Amount: req.amount,
      WalletBalance: req.wallet_balance,
      RequestedAt: format(new Date(req.requested_at), 'yyyy-MM-dd HH:mm'),
      Status: req.status,
      AccountHolder: req.bank_account_holder_name,
      AccountNumber: req.bank_account_number,
      IFSC: req.bank_ifsc_code,
    }));
    const filename = `withdrawal_requests_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    exportToCsv(filename, dataToExport);
    toast.success("Withdrawal data exported successfully.");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Withdrawal Management</CardTitle>
              <CardDescription>Review and process all user withdrawal requests.</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead>Requested Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-5 w-28" /></TableCell><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell></TableRow>
                ))
              ) : isError ? (
                <TableRow><TableCell colSpan={6} className="text-center text-red-500">Error: {error.message}</TableCell></TableRow>
              ) : (
                requests?.map((request) => (
                  <TableRow key={request.request_id}>
                    <TableCell className="font-medium">{request.user_name}</TableCell>
                    <TableCell>₹{request.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <span>₹{request.wallet_balance.toLocaleString('en-IN')}</span>
                      {request.amount > request.wallet_balance && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Insufficient funds for this withdrawal.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(request.requested_at), "PPP")}</TableCell>
                    <TableCell><Badge variant={request.status === "Completed" ? "default" : request.status === "Pending" ? "outline" : "destructive"}>{request.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {request.status === 'Pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setDetailsRequest(request)}><Eye className="mr-2 h-4 w-4" /> View Details</Button>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => setActionToConfirm({ request, status: 'Completed' })} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setActionToConfirm({ request, status: 'Rejected' })} disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!detailsRequest} onOpenChange={() => setDetailsRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdrawal Details for {detailsRequest?.user_name}</AlertDialogTitle>
            <AlertDialogDescription>Please process the payment to the bank account below before approving the request.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-md border bg-muted/50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Account Holder:</span><span className="font-medium">{detailsRequest?.bank_account_holder_name || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Account Number:</span><span className="font-mono">{detailsRequest?.bank_account_number || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IFSC Code:</span><span className="font-mono">{detailsRequest?.bank_ifsc_code || 'N/A'}</span></div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!actionToConfirm} onOpenChange={() => setActionToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to <span className="font-bold">{actionToConfirm?.status.toLowerCase()}</span> this withdrawal request of <span className="font-bold">₹{actionToConfirm?.request.amount.toLocaleString('en-IN')}</span> for <span className="font-bold">{actionToConfirm?.request.user_name}</span>?
              {actionToConfirm?.status === 'Completed' && <p className="mt-2 text-sm text-destructive">Please ensure you have completed the bank transfer before proceeding.</p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleProcessRequest(actionToConfirm!.request, actionToConfirm!.status)} disabled={mutation.isPending}>
              {mutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export default WithdrawalManagement;