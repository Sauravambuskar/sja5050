import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminInvestmentCancellationRequest } from "@/types/database";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { AdminRequestFilters } from "@/components/admin/AdminRequestFilters";
import { useDebounce } from "@/hooks/useDebounce";

const PAGE_SIZE = 10;

const fetchRequests = async (page: number, status: string, search: string) => {
  const { data, error } = await supabase.rpc('get_all_investment_cancellation_requests', {
    p_status_filter: status === 'all' ? null : status,
    p_search_text: search || null,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return data as AdminInvestmentCancellationRequest[];
};

const fetchRequestCount = async (status: string, search: string) => {
  const { data, error } = await supabase.rpc('get_all_investment_cancellation_requests_count', {
    p_status_filter: status === 'all' ? null : status,
    p_search_text: search || null,
  });
  if (error) throw new Error(error.message);
  return data;
};

const processRequest = async ({ requestId, newStatus, notes }: { requestId: string; newStatus: 'Approved' | 'Rejected'; notes: string }) => {
  const { error } = await supabase.rpc('process_investment_cancellation_request', {
    p_request_id: requestId,
    p_new_status: newStatus,
    p_admin_notes: notes,
  });
  if (error) throw new Error(error.message);
};

export const CancellationRequestsTab = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("Pending");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedRequest, setSelectedRequest] = useState<AdminInvestmentCancellationRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<'Approve' | 'Reject' | null>(null);
  const [notes, setNotes] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ['investmentCancellations', page, status, debouncedSearch],
    queryFn: () => fetchRequests(page, status, debouncedSearch),
    placeholderData: keepPreviousData,
  });

  const { data: totalCount } = useQuery({
    queryKey: ['investmentCancellationsCount', status, debouncedSearch],
    queryFn: () => fetchRequestCount(status, debouncedSearch),
  });

  const mutation = useMutation({
    mutationFn: processRequest,
    onSuccess: () => {
      toast.success(`Request has been ${action?.toLowerCase()}d.`);
      queryClient.invalidateQueries({ queryKey: ['investmentCancellations'] });
      queryClient.invalidateQueries({ queryKey: ['investmentCancellationsCount'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Failed to process request: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const handleOpenDialog = (request: AdminInvestmentCancellationRequest, act: 'Approve' | 'Reject') => {
    setSelectedRequest(request);
    setAction(act);
  };

  const handleCloseDialog = () => {
    setSelectedRequest(null);
    setAction(null);
    setNotes("");
    setIsProcessing(false);
  };

  const handleProcessRequest = () => {
    if (!selectedRequest || !action) return;
    setIsProcessing(true);
    const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';
    mutation.mutate({ requestId: selectedRequest.request_id, newStatus, notes });
  };

  return (
    <>
      <AdminRequestFilters
        status={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
        statusOptions={[
          { value: "Pending", label: "Pending" },
          { value: "Approved", label: "Approved" },
          { value: "Rejected", label: "Rejected" },
        ]}
      />
      <div className="border rounded-md mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Investment</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
            ) : requests && requests.length > 0 ? (
              requests.map((req) => (
                <TableRow key={req.request_id}>
                  <TableCell>
                    <div className="font-medium">{req.user_name}</div>
                    <div className="text-sm text-muted-foreground">{req.user_email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{req.plan_name}</div>
                    <div className="text-sm text-muted-foreground">Principal: ₹{req.investment_amount.toLocaleString('en-IN')}</div>
                  </TableCell>
                  <TableCell className="font-medium">₹{req.cancellation_amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                  <TableCell><Badge variant={req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'destructive' : 'outline'}>{req.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {req.status === 'Pending' && (
                      <div className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleOpenDialog(req, 'Approve')}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleOpenDialog(req, 'Reject')}>Reject</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="text-center h-24">No requests found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls currentPage={page} totalCount={totalCount || 0} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <Dialog open={!!selectedRequest} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action} Cancellation Request</DialogTitle>
            <DialogDescription>You are about to {action?.toLowerCase()} this request. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Request Details</AlertTitle>
            <AlertDescription>
              <p><strong>User:</strong> {selectedRequest?.user_name}</p>
              <p><strong>Amount:</strong> ₹{selectedRequest?.cancellation_amount.toLocaleString('en-IN')}</p>
              <p><strong>Reason:</strong> {selectedRequest?.reason}</p>
            </AlertDescription>
          </Alert>
          <Textarea
            placeholder={`Add notes for ${action === 'Approve' ? 'approval' : 'rejection'}...`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={handleCloseDialog} disabled={isProcessing}>Cancel</Button>
            <Button onClick={handleProcessRequest} disabled={isProcessing} variant={action === 'Reject' ? 'destructive' : 'default'}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};