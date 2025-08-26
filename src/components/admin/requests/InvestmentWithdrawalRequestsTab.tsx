import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Loader2, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { usePageLayoutContext } from "@/components/layout/PageLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { usePagination, DOTS } from "@/hooks/usePagination";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 10;

type InvestmentWithdrawalRequest = {
  request_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  investment_amount: number;
  investment_start_date: string;
  requested_at: string;
  status: string;
};

const fetchRequests = async (status: string | null, search: string | null, page: number): Promise<InvestmentWithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_all_investment_withdrawal_requests', {
    p_status_filter: status,
    p_search_text: search,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchTotalCount = async (status: string | null, search: string | null): Promise<number> => {
  const { data, error } = await supabase.rpc('get_all_investment_withdrawal_requests_count', {
    p_status_filter: status,
    p_search_text: search,
  });
  if (error) throw new Error(error.message);
  return data;
};

const processRequest = async ({ requestId, status, notes }: { requestId: string; status: 'Approved' | 'Rejected'; notes: string }) => {
  const { error } = await supabase.rpc('process_investment_withdrawal_request', {
    p_request_id: requestId,
    p_new_status: status,
    p_notes: notes,
  });
  if (error) throw new Error(error.message);
};

export const InvestmentWithdrawalRequestsTab = () => {
  const queryClient = useQueryClient();
  const { handleViewUser } = usePageLayoutContext();
  const [rejectionRequest, setRejectionRequest] = useState<InvestmentWithdrawalRequest | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const filterValue = statusFilter === 'all' ? null : statusFilter;
  const searchValue = debouncedSearchTerm.trim() === '' ? null : debouncedSearchTerm.trim();

  const { data: requests, isLoading } = useQuery<InvestmentWithdrawalRequest[]>({
    queryKey: ['allInvestmentWithdrawalRequests', currentPage, filterValue, searchValue],
    queryFn: () => fetchRequests(filterValue, searchValue, currentPage),
    placeholderData: keepPreviousData,
  });

  const { data: totalRequests } = useQuery<number>({
    queryKey: ['allInvestmentWithdrawalRequestsCount', filterValue, searchValue],
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
      queryClient.invalidateQueries({ queryKey: ['allInvestmentWithdrawalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allInvestmentWithdrawalRequestsCount'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
    },
    onError: (error) => toast.error(`Action failed: ${error.message}`),
    onSettled: () => {
      setRejectionRequest(null);
      setRejectionNotes("");
    }
  });

  const handleProcessRequest = (request: InvestmentWithdrawalRequest, status: 'Approved' | 'Rejected') => {
    const notes = status === 'Approved' ? 'Approved by admin.' : rejectionNotes;
    mutation.mutate({ requestId: request.request_id, status, notes });
  };

  const handleRejectClick = (request: InvestmentWithdrawalRequest) => {
    setRejectionNotes("");
    setRejectionRequest(request);
  };

  const handleConfirmRejection = () => {
    if (!rejectionRequest) return;
    if (rejectionNotes.trim().length < 5) {
      toast.error("Please provide a clear reason for rejection.");
      return;
    }
    handleProcessRequest(rejectionRequest, 'Rejected');
  };

  const renderDesktopView = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('requests.user')}</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>{t('requests.amount')}</TableHead>
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
                  <Button variant="link" className="p-0 h-auto" onClick={() => handleViewUser(request.user_id)}>{request.user_name}</Button>
                  <div className="text-xs text-muted-foreground">{request.user_email}</div>
                </TableCell>
                <TableCell>{request.plan_name}</TableCell>
                <TableCell>₹{request.investment_amount.toLocaleString('en-IN')}</TableCell>
                <TableCell>{format(new Date(request.requested_at), "PPP p")}</TableCell>
                <TableCell><Badge variant={request.status === "Approved" ? "success" : request.status === "Pending" ? "outline" : "destructive"}>{request.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {request.status === 'Pending' && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleProcessRequest(request, 'Approved')} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" /> {t('requests.approve')}</Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleRejectClick(request)} disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" /> {t('requests.reject')}</Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow><TableCell colSpan={6} className="h-24 text-center">{t('requests.no_investment_withdrawals')}</TableCell></TableRow>
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
                    <Button variant="link" className="p-0 h-auto text-base" onClick={() => handleViewUser(request.user_id)}>{request.user_name}</Button>
                  </CardTitle>
                  <div className="text-lg font-bold text-primary">₹{request.investment_amount.toLocaleString('en-IN')}</div>
                </div>
                <Badge variant={request.status === "Approved" ? "success" : request.status === "Pending" ? "outline" : "destructive"}>{request.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-center">
                <span className="text-muted-foreground w-24">Plan:</span>
                <span>{request.plan_name}</span>
              </div>
              <div className="flex items-center">
                <span className="text-muted-foreground w-24">Requested:</span>
                <span>{format(new Date(request.requested_at), "PP p")}</span>
              </div>
            </CardContent>
            {request.status === 'Pending' && (
              <CardFooter className="flex justify-end gap-2">
                <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleRejectClick(request)} disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" /> {t('requests.reject')}</Button>
                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleProcessRequest(request, 'Approved')} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" /> {t('requests.approve')}</Button>
              </CardFooter>
            )}
          </Card>
        ))
      ) : (
        <div className="h-24 text-center flex items-center justify-center">{t('requests.no_investment_withdrawals')}</div>
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
            <SelectItem value="Approved">Approved</SelectItem>
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
      <AlertDialog open={!!rejectionRequest} onOpenChange={() => setRejectionRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Investment Withdrawal?</AlertDialogTitle>
            <AlertDialogDescription>Please provide a reason for rejecting this request. This note will be visible to the user.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="rejection-notes">Rejection Notes (Required)</Label>
            <Textarea id="rejection-notes" placeholder="e.g., Investment has not reached minimum term..." value={rejectionNotes} onChange={(e) => setRejectionNotes(e.target.value)} className="mt-2" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRejection} disabled={mutation.isPending}>{mutation.isPending ? <Loader2 className="animate-spin" /> : "Confirm Rejection"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};