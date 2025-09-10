import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UnifiedWithdrawalRequest } from "@/types/database";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination, DOTS } from "@/hooks/usePagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  // AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle, XCircle } from "lucide-react";
import { usePageLayoutContext } from "@/components/layout/PageLayout";

const PAGE_SIZE = 10;

const fetchRequests = async (status: string | null, search: string | null, page: number): Promise<UnifiedWithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_all_withdrawal_requests', {
    p_status_filter: status,
    p_search_text: search,
    p_request_type: 'Wallet',
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
    p_request_type: 'Wallet',
  });
  if (error) throw new Error(error.message);
  return data;
};

const processRequest = async ({ requestId, status, notes }: { requestId: string; status: 'Approved' | 'Rejected'; notes: string }) => {
  const { error } = await supabase.rpc('process_withdrawal_request', {
    p_request_id: requestId,
    p_new_status: status,
    p_notes: notes,
  });
  if (error) throw new Error(error.message);
};

export const WalletWithdrawalsTab = () => {
  const queryClient = useQueryClient();
  const { handleViewUser } = usePageLayoutContext();
  const [processingRequest, setProcessingRequest] = useState<UnifiedWithdrawalRequest | null>(null);
  const [notes, setNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const isMobile = useIsMobile();

  const filterValue = statusFilter === 'all' ? null : statusFilter;
  const searchValue = debouncedSearchTerm.trim() === '' ? null : debouncedSearchTerm.trim();

  const { data: requests, isLoading } = useQuery<UnifiedWithdrawalRequest[]>({
    queryKey: ['allWalletWithdrawalRequests', currentPage, filterValue, searchValue],
    queryFn: () => fetchRequests(filterValue, searchValue, currentPage),
    placeholderData: keepPreviousData,
  });

  const { data: totalRequests } = useQuery<number>({
    queryKey: ['allWalletWithdrawalRequestsCount', filterValue, searchValue],
    queryFn: () => fetchTotalCount(filterValue, searchValue),
  });

  const paginationRange = usePagination({ currentPage, totalCount: totalRequests || 0, pageSize: PAGE_SIZE });
  const pageCount = totalRequests ? Math.ceil(totalRequests / PAGE_SIZE) : 0;

  const mutation = useMutation({
    mutationFn: processRequest,
    onSuccess: (_, variables) => {
      toast.success(`Request has been ${variables.status.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['allWalletWithdrawalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allWalletWithdrawalRequestsCount'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
    },
    onError: (error) => toast.error(`Action failed: ${error.message}`),
    onSettled: () => setProcessingRequest(null),
  });

  const handleProcessClick = (request: UnifiedWithdrawalRequest) => {
    setNotes("");
    setProcessingRequest(request);
  };

  const handleConfirmProcess = (status: 'Approved' | 'Rejected') => {
    if (!processingRequest) return;
    if (status === 'Rejected' && notes.trim().length < 5) {
      toast.error("Please provide a clear reason for rejection.");
      return;
    }
    const finalNotes = status === 'Approved' ? (notes || 'Approved by admin') : notes;
    mutation.mutate({ requestId: processingRequest.request_id, status, notes: finalNotes });
  };

  const renderDesktopView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Wallet Balance</TableHead>
          <TableHead>Bank Details</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
          : requests?.map((req) => (
            <TableRow key={req.request_id}>
              <TableCell><Button variant="link" className="p-0 h-auto" onClick={() => handleViewUser(req.user_id)}>{req.user_name || 'Deleted User'}</Button></TableCell>
              <TableCell>₹{req.amount.toLocaleString('en-IN')}</TableCell>
              <TableCell>₹{req.details.wallet_balance?.toLocaleString('en-IN')}</TableCell>
              <TableCell className="text-xs">
                <div>{req.details.bank_account_holder_name}</div>
                <div>{req.details.bank_account_number}</div>
                <div>{req.details.bank_ifsc_code}</div>
              </TableCell>
              <TableCell>{format(new Date(req.requested_at), "PP p")}</TableCell>
              <TableCell><Badge variant={req.status === "Completed" ? "success" : req.status === "Pending" ? "outline" : "destructive"}>{req.status}</Badge></TableCell>
              <TableCell className="text-right">
                {req.status === 'Pending' && <Button size="sm" onClick={() => handleProcessClick(req)}>Process</Button>}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading ? [...Array(3)].map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>)
        : requests?.map((req) => (
          <Card key={req.request_id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base"><Button variant="link" className="p-0 h-auto text-base" onClick={() => handleViewUser(req.user_id)}>{req.user_name || 'Deleted User'}</Button></CardTitle>
                  <div className="text-lg font-bold text-primary">₹{req.amount.toLocaleString('en-IN')}</div>
                </div>
                <Badge variant={req.status === "Completed" ? "success" : req.status === "Pending" ? "outline" : "destructive"}>{req.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div><strong>Wallet Balance:</strong> ₹{req.details.wallet_balance?.toLocaleString('en-IN')}</div>
              <div><strong>Bank Name:</strong> {req.details.bank_account_holder_name}</div>
              <div><strong>Account No:</strong> {req.details.bank_account_number}</div>
              <div><strong>Requested:</strong> {format(new Date(req.requested_at), "PP p")}</div>
            </CardContent>
            {req.status === 'Pending' && <CardFooter><Button className="w-full" onClick={() => handleProcessClick(req)}>Process Request</Button></CardFooter>}
          </Card>
        ))}
    </div>
  );

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
        <div className="relative flex-grow"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Search by name or email..." className="w-full rounded-lg bg-background pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="Rejected">Rejected</SelectItem></SelectContent></Select>
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
      <AlertDialog open={!!processingRequest} onOpenChange={() => setProcessingRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Process Wallet Withdrawal</AlertDialogTitle>
            <AlertDialogDescription>Review the details and approve or reject this request. Notes are required for rejection.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 text-sm">
            <p><strong>User:</strong> {processingRequest?.user_name}</p>
            <p><strong>Amount:</strong> ₹{processingRequest?.amount.toLocaleString('en-IN')}</p>
          </div>
          <div className="py-2">
            <Label htmlFor="rejection-notes">Admin Notes</Label>
            <Textarea id="rejection-notes" placeholder="e.g., Approved. / Rejected due to..." value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => handleConfirmProcess('Rejected')} disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" />{mutation.isPending ? "Processing..." : "Reject"}</Button>
            <Button onClick={() => handleConfirmProcess('Approved')} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" />{mutation.isPending ? "Processing..." : "Approve"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};