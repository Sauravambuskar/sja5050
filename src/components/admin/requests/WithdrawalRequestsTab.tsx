import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, XCircle, Eye, AlertTriangle, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminWithdrawalRequest } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { usePageLayoutContext } from "@/components/layout/PageLayout";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { usePagination, DOTS } from "@/hooks/usePagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 10;

const fetchRequests = async (status: string | null, search: string | null, page: number): Promise<AdminWithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_all_withdrawal_requests', {
    p_status_filter: status,
    p_search_text: search,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchTotalCount = async (status: string | null, search: string | null): Promise<number> => {
  const { data, error } = await supabase.rpc('get_all_withdrawal_requests_count', {
    p_status_filter: status,
    p_search_text: search,
  });
  if (error) throw new Error(error.message);
  return data;
};

const processRequest = async ({ requestId, status, notes }: { requestId: string; status: 'Completed' | 'Rejected'; notes: string }) => {
  const { error } = await supabase.rpc('process_withdrawal_request', {
    request_id_to_process: requestId,
    new_status: status,
    notes: notes,
  });
  if (error) throw new Error(error.message);
};

export const WithdrawalRequestsTab = () => {
  const queryClient = useQueryClient();
  const { handleViewUser } = usePageLayoutContext();
  const [detailsRequest, setDetailsRequest] = useState<AdminWithdrawalRequest | null>(null);
  const [actionToConfirm, setActionToConfirm] = useState<{ request: AdminWithdrawalRequest; status: 'Completed' | 'Rejected' } | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const filterValue = statusFilter === 'all' ? null : statusFilter;
  const searchValue = debouncedSearchTerm.trim() === '' ? null : debouncedSearchTerm.trim();

  const { data: requests, isLoading } = useQuery<AdminWithdrawalRequest[]>({
    queryKey: ['allWithdrawalRequests', currentPage, filterValue, searchValue],
    queryFn: () => fetchRequests(filterValue, searchValue, currentPage),
    placeholderData: keepPreviousData,
  });

  const { data: totalRequests } = useQuery<number>({
    queryKey: ['allWithdrawalRequestsCount', filterValue, searchValue],
    queryFn: () => fetchTotalCount(filterValue, searchValue),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearchTerm]);

  const paginationRange = usePagination({ currentPage, totalCount: totalRequests || 0, pageSize: PAGE_SIZE });
  const pageCount = totalRequests ? Math.ceil(totalRequests / PAGE_SIZE) : 0;

  const mutation = useMutation({
    mutationFn: processRequest,
    onSuccess: (_, variables) => {
      toast.success(`Request has been ${variables.status.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['allWithdrawalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allWithdrawalRequestsCount'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
    },
    onError: (error) => toast.error(`Action failed: ${error.message}`),
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

  const renderDesktopView = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('requests.user')}</TableHead>
            <TableHead>{t('requests.amount')}</TableHead>
            <TableHead>Wallet Balance</TableHead>
            <TableHead>{t('requests.requested')}</TableHead>
            <TableHead>{t('requests.status')}</TableHead>
            <TableHead className="text-right">{t('requests.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
          ) : requests && requests.length > 0 ? (
            requests.map((request) => (
              <TableRow key={request.request_id}>
                <TableCell>
                  <Button variant="link" className="p-0 h-auto" onClick={() => handleViewUser(request.user_id)}>{request.user_name || 'Deleted User'}</Button>
                </TableCell>
                <TableCell>₹{request.amount.toLocaleString('en-IN')}</TableCell>
                <TableCell className="flex items-center gap-2">
                  <span>₹{request.wallet_balance.toLocaleString('en-IN')}</span>
                  {request.amount > request.wallet_balance && (
                    <TooltipProvider><Tooltip><TooltipTrigger><AlertTriangle className="h-4 w-4 text-destructive" /></TooltipTrigger><TooltipContent><p>Insufficient funds.</p></TooltipContent></Tooltip></TooltipProvider>
                  )}
                </TableCell>
                <TableCell>{format(new Date(request.requested_at), "PPP")}</TableCell>
                <TableCell><Badge variant={request.status === "Completed" ? "success" : request.status === "Pending" ? "outline" : "destructive"}>{request.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {request.status === 'Pending' && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDetailsRequest(request)}><Eye className="mr-2 h-4 w-4" /> Details</Button>
                      <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => setActionToConfirm({ request, status: 'Completed' })} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" /> {t('requests.approve')}</Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { setRejectionNotes(""); setActionToConfirm({ request, status: 'Rejected' }); }} disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" /> {t('requests.reject')}</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow><TableCell colSpan={6} className="h-24 text-center">{t('requests.no_withdrawals')}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading ? (
        [...Array(3)].map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>)
      ) : requests && requests.length > 0 ? (
        requests.map((request) => (
          <Card key={request.request_id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">
                    <Button variant="link" className="p-0 h-auto text-base" onClick={() => handleViewUser(request.user_id)}>{request.user_name || 'Deleted User'}</Button>
                  </CardTitle>
                  <div className="text-lg font-bold text-primary">₹{request.amount.toLocaleString('en-IN')}</div>
                </div>
                <Badge variant={request.status === "Completed" ? "success" : request.status === "Pending" ? "outline" : "destructive"}>{request.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-center">
                <span className="text-muted-foreground w-28">Wallet Balance:</span>
                <span className="flex items-center gap-2">
                  ₹{request.wallet_balance.toLocaleString('en-IN')}
                  {request.amount > request.wallet_balance && (
                    <TooltipProvider><Tooltip><TooltipTrigger><AlertTriangle className="h-4 w-4 text-destructive" /></TooltipTrigger><TooltipContent><p>Insufficient funds.</p></TooltipContent></Tooltip></TooltipProvider>
                  )}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-muted-foreground w-28">Requested:</span>
                <span>{format(new Date(request.requested_at), "PP")}</span>
              </div>
            </CardContent>
            {request.status === 'Pending' && (
              <CardFooter className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setDetailsRequest(request)}><Eye className="mr-2 h-4 w-4" /> Details</Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { setRejectionNotes(""); setActionToConfirm({ request, status: 'Rejected' }); }} disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" /> {t('requests.reject')}</Button>
                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => setActionToConfirm({ request, status: 'Completed' })} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" /> {t('requests.approve')}</Button>
              </CardFooter>
            )}
          </Card>
        ))
      ) : (
        <div className="h-24 text-center flex items-center justify-center">{t('requests.no_withdrawals')}</div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search by name or email..." className="w-full rounded-lg bg-background pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isMobile ? renderMobileView() : renderDesktopView()}
      {pageCount > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(p => p - 1); }} className={cn(currentPage === 1 && "pointer-events-none opacity-50")} /></PaginationItem>
            {paginationRange?.map((page, i) => page === DOTS ? <PaginationItem key={`dots-${i}`}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={page}><PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page as number); }} isActive={currentPage === page}>{page}</PaginationLink></PaginationItem>)}
            <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (currentPage < pageCount) setCurrentPage(p => p + 1); }} className={cn(currentPage === pageCount && "pointer-events-none opacity-50")} /></PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      <AlertDialog open={!!detailsRequest} onOpenChange={() => setDetailsRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdrawal Details for {detailsRequest?.user_name}</AlertDialogTitle>
            <AlertDialogDescription>Please process the payment to the bank account below before approving.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-md border bg-muted/50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Holder:</span><span className="font-medium">{detailsRequest?.bank_account_holder_name || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Account No:</span><span className="font-mono">{detailsRequest?.bank_account_number || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IFSC:</span><span className="font-mono">{detailsRequest?.bank_ifsc_code || 'N/A'}</span></div>
          </div>
          <AlertDialogFooter><AlertDialogCancel>Close</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!actionToConfirm} onOpenChange={() => setActionToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionToConfirm?.status.toLowerCase()} this request of ₹{actionToConfirm?.request.amount.toLocaleString('en-IN')}?
              {actionToConfirm?.status === 'Completed' && <p className="mt-2 text-sm text-destructive">Ensure you have completed the bank transfer before proceeding.</p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionToConfirm?.status === 'Rejected' && (
            <div className="py-2">
              <Label htmlFor="rejection-notes">Rejection Notes (Required)</Label>
              <Textarea id="rejection-notes" placeholder="e.g., Bank details incorrect..." value={rejectionNotes} onChange={(e) => setRejectionNotes(e.target.value)} className="mt-2" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProcessRequest} disabled={mutation.isPending}>{mutation.isPending ? "Processing..." : "Confirm"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};