import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Copy } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminDepositRequest } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const fetchDepositRequests = async (): Promise<AdminDepositRequest[]> => {
  const { data, error } = await supabase.rpc('get_all_deposit_requests');
  if (error) throw new Error(error.message);
  return data;
};

const processRequest = async ({ requestId, status, notes }: { requestId: string; status: 'Approved' | 'Rejected'; notes: string }) => {
  const { data, error } = await supabase.rpc('process_deposit_request', {
    request_id_to_process: requestId,
    new_status: status,
    notes: notes,
  });
  if (error) throw new Error(error.message);
  return data;
};

const DepositManagement = () => {
  const queryClient = useQueryClient();
  const [actionToConfirm, setActionToConfirm] = useState<{ request: AdminDepositRequest; status: 'Approved' | 'Rejected' } | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");

  const { data: requests, isLoading, isError, error } = useQuery<AdminDepositRequest[]>({
    queryKey: ['allDepositRequests'],
    queryFn: fetchDepositRequests,
  });

  const mutation = useMutation({
    mutationFn: processRequest,
    onSuccess: (data, variables) => {
      toast.success(`Request has been ${variables.status.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['allDepositRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });
    },
    onError: (error) => {
      toast.error(`Action failed: ${error.message}`);
    },
    onSettled: () => {
      setActionToConfirm(null);
      setRejectionNotes("");
    }
  });

  const handleProcessRequest = () => {
    if (!actionToConfirm) return;
    const { request, status } = actionToConfirm;
    let notes = "";
    if (status === 'Approved') {
      notes = 'Approved by admin.';
    } else {
      if (rejectionNotes.trim().length < 5) {
        toast.error("Please provide a clear reason for rejection.");
        return;
      }
      notes = rejectionNotes;
    }
    mutation.mutate({ requestId: request.request_id, status, notes });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <>
      <h1 className="text-3xl font-bold">Deposit Management</h1>
      <p className="text-muted-foreground">Review and process all user deposit requests.</p>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pending Deposit Requests</CardTitle>
          <CardDescription>Verify these transactions in your bank account before approving.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference ID</TableHead>
                <TableHead>Requested Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-5 w-28" /></TableCell><TableCell><Skeleton className="h-5 w-28" /></TableCell><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell></TableRow>
                ))
              ) : isError ? (
                <TableRow><TableCell colSpan={6} className="text-center text-red-500">Error: {error.message}</TableCell></TableRow>
              ) : (
                requests?.map((request) => (
                  <TableRow key={request.request_id}>
                    <TableCell className="font-medium">{request.user_name}</TableCell>
                    <TableCell>₹{request.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{request.reference_id}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(request.reference_id)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(request.requested_at), "PPP p")}</TableCell>
                    <TableCell><Badge variant={request.status === "Approved" ? "default" : request.status === "Pending" ? "outline" : "destructive"}>{request.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {request.status === 'Pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => setActionToConfirm({ request, status: 'Approved' })} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
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

      <AlertDialog open={!!actionToConfirm} onOpenChange={() => setActionToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action: {actionToConfirm?.status}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionToConfirm?.status.toLowerCase()} this deposit request of <span className="font-bold">₹{actionToConfirm?.request.amount.toLocaleString('en-IN')}</span> for <span className="font-bold">{actionToConfirm?.request.user_name}</span>?
              {actionToConfirm?.status === 'Approved' && <p className="mt-2 text-sm text-primary">Please ensure you have verified this transaction in your bank account before proceeding.</p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionToConfirm?.status === 'Rejected' && (
            <div className="py-2">
              <Label htmlFor="rejection-notes">Rejection Notes (Required)</Label>
              <Textarea id="rejection-notes" placeholder="e.g., Transaction not found, amount mismatch..." value={rejectionNotes} onChange={(e) => setRejectionNotes(e.target.value)} className="mt-2" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProcessRequest} disabled={mutation.isPending}>
              {mutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export default DepositManagement;