import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Eye, Download, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminDepositRequest } from "@/types/database";
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
import { ScreenshotViewerDialog } from "@/components/admin/ScreenshotViewerDialog";

const PAGE_SIZE = 10;

const fetchDepositRequests = async (page: number, statusFilter: string | null): Promise<AdminDepositRequest[]> => {
  const { data, error } = await supabase.rpc('get_all_deposit_requests', {
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
    p_status_filter: statusFilter,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchDepositRequestsCount = async (statusFilter: string | null): Promise<number> => {
  const { data, error } = await supabase.rpc('get_all_deposit_requests_count', {
    p_status_filter: statusFilter,
  });
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

const sendDepositEmail = async ({ to, name, amount, status, notes }: { to: string | null; name: string | null; amount: number; status: string; notes: string }) => {
  if (!to) {
    console.error("Cannot send deposit email: user email is missing.");
    toast.warning("Deposit processed, but the confirmation email could not be sent as the user's email is missing.");
    return;
  }
  const subject = `Your Deposit Request has been ${status}`;
  const html = status === 'Approved'
    ? `<p>Hi ${name || 'Valued Customer'},</p><p>Your deposit request for ₹${amount.toLocaleString('en-IN')} has been successfully processed and the amount has been credited to your wallet.</p><p>Thank you for choosing SJA Foundation.</p>`
    : `<p>Hi ${name || 'Valued Customer'},</p><p>Your deposit request for ₹${amount.toLocaleString('en-IN')} was rejected.</p><p>Reason: ${notes}</p><p>Please contact support if you have any questions.</p>`;

  try {
    const { error } = await supabase.functions.invoke('send-transactional-email', { body: { to, subject, html } });
    if (error) {
      console.error("Failed to send deposit email:", error);
      toast.warning("Deposit processed, but the confirmation email could not be sent.");
    }
  } catch (error) {
    console.error("Error invoking send-transactional-email function:", error);
    toast.warning("Deposit processed, but there was an error sending the confirmation email.");
  }
};

const DepositManagement = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { handleViewUser } = usePageLayoutContext();
  const [screenshotRequestToView, setScreenshotRequestToView] = useState<AdminDepositRequest | null>(null); // Changed state type
  const [actionToConfirm, setActionToConfirm] = useState<{ request: AdminDepositRequest; status: 'Approved' | 'Rejected' } | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const filterValue = statusFilter === 'all' ? null : statusFilter;

  const { data: requests, isLoading, isError, error } = useQuery<AdminDepositRequest[]>({
    queryKey: ['allDepositRequests', currentPage, filterValue],
    queryFn: () => fetchDepositRequests(currentPage, filterValue),
    placeholderData: keepPreviousData,
  });

  const { data: totalRequests } = useQuery<number>({
    queryKey: ['allDepositRequestsCount', filterValue],
    queryFn: () => fetchDepositRequestsCount(filterValue),
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
      queryClient.invalidateQueries({ queryKey: ['allDepositRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allDepositRequestsCount'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });

      if (actionToConfirm) {
        sendDepositEmail({
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
    
    const notes = status === 'Approved' ? 'Approved by admin.' : rejectionNotes;
    mutation.mutate({ requestId: request.request_id, status, notes });
  };

  const handleExport = async () => {
    setIsExporting(true);
    toast.info("Preparing your full deposit history for export...");
    try {
      const { data, error } = await supabase.rpc('export_all_deposit_requests');
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
        ReferenceID: req.reference_id,
        RequestedAt: format(new Date(req.requested_at), 'yyyy-MM-dd HH:mm'),
        Status: req.status,
        AdminNotes: req.admin_notes,
      }));
      const filename = `all_deposit_requests_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      exportToCsv(filename, dataToExport);
      toast.success("Deposit data exported successfully.");
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
          <TableHead>Reference ID</TableHead>
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
              <TableCell>{request.reference_id}</TableCell>
              <TableCell>{format(new Date(request.requested_at), "PPP")}</TableCell>
              <TableCell><Badge variant={request.status === "Approved" ? "success" : request.status === "Pending" ? "outline" : "destructive"}>{request.status}</Badge></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setScreenshotRequestToView(request)} disabled={!request.screenshot_path}><Eye className="mr-2 h-4 w-4" /> Proof</Button>
                  {request.status === 'Pending' && (
                    <>
                      <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => setActionToConfirm({ request, status: 'Approved' })} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { setRejectionNotes(""); setActionToConfirm({ request, status: 'Rejected' }); }} disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                    </>
                  )}
                </div>
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
                <Badge variant={request.status === "Approved" ? "success" : request.status === "Pending" ? "outline" : "destructive"}>{request.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{format(new Date(request.requested_at), "PPP")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Reference ID</span><span>{request.reference_id}</span></div>
            </CardContent>
            <div className="p-4 border-t flex flex-col sm:flex-row justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setScreenshotRequestToView(request)} disabled={!request.screenshot_path}><Eye className="mr-2 h-4 w-4" /> View Proof</Button>
              {request.status === 'Pending' && (
                <>
                  <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => setActionToConfirm({ request, status: 'Approved' })} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { setRejectionNotes(""); setActionToConfirm({ request, status: 'Rejected' }); }} disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                </>
              )}
            </div>
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
              <CardTitle>Deposit Management</CardTitle>
              <CardDescription>Review and process all user deposit requests.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
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

      <ScreenshotViewerDialog
        isOpen={!!screenshotRequestToView}
        onClose={() => setScreenshotRequestToView(null)}
        request={screenshotRequestToView} // Changed prop name
      />

      <AlertDialog open={!!actionToConfirm} onOpenChange={() => setActionToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to <span className="font-bold">{actionToConfirm?.status.toLowerCase()}</span> this deposit request of <span className="font-bold">₹{actionToConfirm?.request.amount.toLocaleString('en-IN')}</span> for <span className="font-bold">{actionToConfirm?.request.user_name || 'this user'}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionToConfirm?.status === 'Rejected' && (
            <div className="py-2">
              <Label htmlFor="rejection-notes">Rejection Notes (Required)</Label>
              <Textarea id="rejection-notes" placeholder="e.g., Screenshot unclear, reference ID mismatch..." value={rejectionNotes} onChange={(e) => setRejectionNotes(e.target.value)} className="mt-2" />
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