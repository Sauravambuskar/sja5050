import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, XCircle, Eye, AlertTriangle, Download, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminWithdrawalRequest } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { cn, exportToCsv } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePageLayoutContext } from "@/components/layout/PageLayout";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { usePagination, DOTS } from "@/hooks/usePagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 10;

const fetchWithdrawalRequests = async (page: number, statusFilter: string | null): Promise<AdminWithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_all_withdrawal_requests', {
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
    p_status_filter: statusFilter,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchWithdrawalRequestsCount = async (statusFilter: string | null): Promise<number> => {
  const { data, error } = await supabase.rpc('get_all_withdrawal_requests_count', {
    p_status_filter: statusFilter,
  });
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

// Moved outside the component for better performance
const sendWithdrawalEmail = async ({ to, name, amount, status, notes }: { to: string | null; name: string | null; amount: number; status: string; notes: string }) => {
  if (!to) {
    console.error("Cannot send withdrawal email: user email is missing.");
    toast.warning("Withdrawal processed, but the confirmation email could not be sent as the user's email is missing.");
    return;
  }
  const subject = `Your Withdrawal Request has been ${status}`;
  const html = status === 'Completed'
    ? `<p>Hi ${name || 'Valued Customer'},</p><p>Your withdrawal request for ₹${amount.toLocaleString('en-IN')} has been successfully processed.</p><p>Thank you for choosing SJA Foundation.</p>`
    : `<p>Hi ${name || 'Valued Customer'},</p><p>Your withdrawal request for ₹${amount.toLocaleString('en-IN')} was rejected.</p><p>Reason: ${notes}</p><p>Please contact support if you have any questions.</p>`;

  try {
    const { error } = await supabase.functions.invoke('send-transactional-email', { body: { to, subject, html } });
    if (error) {
      console.error("Failed to send withdrawal email:", error);
      toast.warning("Withdrawal processed, but the confirmation email could not be sent.");
    }
  } catch (error) {
    console.error("Error invoking send-transactional-email function:", error);
    toast.warning("Withdrawal processed, but there was an error sending the confirmation email.");
  }
};

const WithdrawalManagement = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { handleViewUser } = usePageLayoutContext();
  const [detailsRequest, setDetailsRequest] = useState<AdminWithdrawalRequest | null>(null);
  const [actionToConfirm, setActionToConfirm] = useState<{ request: AdminWithdrawalRequest; status: 'Completed' | 'Rejected' } | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const filterValue = statusFilter === 'all' ? null : statusFilter;

  const { data: requests, isLoading, isError, error } = useQuery<AdminWithdrawalRequest[]>({
    queryKey: ['allWithdrawalRequests', currentPage, filterValue],
    queryFn: () => fetchWithdrawalRequests(currentPage, filterValue),
    placeholderData: keepPreviousData,
  });

  const { data: totalRequests } = useQuery<number>({
    queryKey: ['allWithdrawalRequestsCount', filterValue],
    queryFn: () => fetchWithdrawalRequestsCount(filterValue),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const paginationRange = usePagination({
    currentPage,
    totalCount: totalRequests || 0,
    pageSize: PAGE_SIZE,
  });
  const pageCount = totalRequests ? Math.ceil(totalRequests / PAGE_SIZE) : 0;

  const mutation = useMutation({
    mutationFn: processRequest,
    onSuccess: (data, variables) => {
      toast.success(`Request has been ${variables.status.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['allWithdrawalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allWithdrawalRequestsCount'] });
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
      setRejectionNotes("");
    }
  });

  const handleProcessRequest = () => {
    if (!actionToConfirm) return;
    const { request, status } = actionToConfirm;
    
    if (status === 'Rejected' && rejectionNotes.trim().length < 5) {
      toast.error("Please provide a clear reason for rejection.");
      return;
    }
    
    const notes = status === 'Completed' ? 'Approved by admin.' : rejectionNotes;
    mutation.mutate({ requestId: request.request_id, status, notes });
  };

  const handleExport = async () => {
    setIsExporting(true);
    toast.info("Preparing your full withdrawal history for export...");
    try {
      const { data, error } = await supabase.rpc('export_all_withdrawal_requests');
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.warning("No data to export.");
        return;
      }
      const dataToExport = data.map(req => ({
        RequestID: req.request_id,
        UserName: req.user_name,
        UserEmail: req.user_email,
        Amount: req.amount,
        WalletBalance: req.wallet_balance,
        RequestedAt: format(new Date(req.requested_at), 'yyyy-MM-dd HH:mm'),
        Status: req.status,
        AccountHolder: req.bank_account_holder_name,
        AccountNumber: req.bank_account_number,
        IFSC: req.bank_ifsc_code,
        AdminNotes: req.admin_notes,
      }));
      const filename = `all_withdrawal_requests_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      exportToCsv(filename, dataToExport);
      toast.success("Withdrawal data exported successfully.");
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const renderPagination = () => (
    pageCount > 1 && (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(p => p - 1); }} className={cn(currentPage === 1 && "pointer-events-none opacity-50")} />
          </PaginationItem>
          {paginationRange?.map((pageNumber, index) => {
            if (pageNumber === DOTS) {
              return <PaginationItem key={`dots-${index}`}><PaginationEllipsis /></PaginationItem>;
            }
            return (
              <PaginationItem key={pageNumber}>
                <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(pageNumber as number); }} isActive={currentPage === pageNumber}>
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (currentPage < pageCount) setCurrentPage(p => p + 1); }} className={cn(currentPage === pageCount && "pointer-events-none opacity-50")} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  );

  const renderDesktopView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Wallet Balance</TableHead>
          <TableHead>Requested Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && !requests ? (
          [...Array(PAGE_SIZE)].map((_, i) => (
            <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
          ))
        ) : isError ? (
          <TableRow><TableCell colSpan={6} className="text-center text-red-500">Error: {error.message}</TableCell></TableRow>
        ) : (
          requests?.map((request) => (
            <TableRow key={request.request_id}>
              <TableCell>
                <Button variant="link" className="p-0 h-auto" onClick={() => handleViewUser(request.user_id)}>
                  {request.user_name || 'Deleted User'}
                </Button>
              </TableCell>
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
              <TableCell><Badge variant={request.status === "Completed" ? "success" : request.status === "Pending" ? "outline" : "destructive"}>{request.status}</Badge></TableCell>
              <TableCell className="text-right">
                {request.status === 'Pending' && (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDetailsRequest(request)}><Eye className="mr-2 h-4 w-4" /> Details</Button>
                    <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => setActionToConfirm({ request, status: 'Completed' })} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { setRejectionNotes(""); setActionToConfirm({ request, status: 'Rejected' }); }} disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading && !requests ? (
        [...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)
      ) : isError ? (
        <div className="text-center text-red-500 p-4">Error: {error.message}</div>
      ) : (
        requests?.map((request) => (
          <Card key={request.request_id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>₹{request.amount.toLocaleString('en-IN')}</CardTitle>
                  <Button variant="link" className="p-0 h-auto" onClick={() => handleViewUser(request.user_id)}>
                    {request.user_name || 'Deleted User'}
                  </Button>
                </div>
                <Badge variant={request.status === "Completed" ? "success" : request.status === "Pending" ? "outline" : "destructive"}>{request.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{format(new Date(request.requested_at), "PPP")}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Wallet Balance</span><div className="flex items-center gap-1"><span>₹{request.wallet_balance.toLocaleString('en-IN')}</span>{request.amount > request.wallet_balance && (<AlertTriangle className="h-4 w-4 text-destructive" />)}</div></div>
            </CardContent>
            {request.status === 'Pending' && (
              <div className="p-4 border-t flex flex-col sm:flex-row justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setDetailsRequest(request)}><Eye className="mr-2 h-4 w-4" /> Details</Button>
                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => setActionToConfirm({ request, status: 'Completed' })} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { setRejectionNotes(""); setActionToConfirm({ request, status: 'Rejected' }); }} disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Withdrawal Management</CardTitle>
              <CardDescription>Review and process all user withdrawal requests.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="gap-1" onClick={handleExport} disabled={isExporting}>
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isMobile ? renderMobileView() : renderDesktopView()}
          {renderPagination()}
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
              Are you sure you want to <span className="font-bold">{actionToConfirm?.status.toLowerCase()}</span> this withdrawal request of <span className="font-bold">₹{actionToConfirm?.request.amount.toLocaleString('en-IN')}</span> for <span className="font-bold">{actionToConfirm?.request.user_name || 'this user'}</span>?
              {actionToConfirm?.status === 'Completed' && <p className="mt-2 text-sm text-destructive">Please ensure you have completed the bank transfer before proceeding.</p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionToConfirm?.status === 'Rejected' && (
            <div className="py-2">
              <Label htmlFor="rejection-notes">Rejection Notes (Required)</Label>
              <Textarea id="rejection-notes" placeholder="e.g., Bank details incorrect, suspicious activity..." value={rejectionNotes} onChange={(e) => setRejectionNotes(e.target.value)} className="mt-2" />
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
export default WithdrawalManagement;