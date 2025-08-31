import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Info } from "lucide-react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { usePageLayoutContext } from "@/components/layout/PageLayout";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { usePagination, DOTS } from "@/hooks/usePagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AdminInvestmentWithdrawalRequest } from "@/types/database";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const PAGE_SIZE = 10;

const fetchRequests = async (page: number, status: string | null, search: string | null): Promise<AdminInvestmentWithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_all_investment_withdrawal_requests', {
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
    p_status_filter: status,
    p_search_text: search,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchRequestsCount = async (status: string | null, search: string | null): Promise<number> => {
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

const InvestmentWithdrawalManagement = () => {
  const queryClient = useQueryClient();
  const { handleViewUser } = usePageLayoutContext();
  const [rejectionRequest, setRejectionRequest] = useState<AdminInvestmentWithdrawalRequest | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filterValue = statusFilter === 'all' ? null : statusFilter;
  const searchValue = debouncedSearchTerm.trim() === '' ? null : debouncedSearchTerm;

  const { data: requests, isLoading } = useQuery<AdminInvestmentWithdrawalRequest[]>({
    queryKey: ['allInvestmentWithdrawalRequests', currentPage, filterValue, searchValue],
    queryFn: () => fetchRequests(currentPage, filterValue, searchValue),
    placeholderData: keepPreviousData,
  });

  const { data: totalRequests } = useQuery<number>({
    queryKey: ['allInvestmentWithdrawalRequestsCount', filterValue, searchValue],
    queryFn: () => fetchRequestsCount(filterValue, searchValue),
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
      queryClient.invalidateQueries({ queryKey: ['adminActionCounts'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
    },
    onError: (error) => toast.error(`Action failed: ${error.message}`),
    onSettled: () => {
      setRejectionRequest(null);
      setRejectionNotes("");
    }
  });

  const handleProcessRequest = (request: AdminInvestmentWithdrawalRequest, status: 'Approved' | 'Rejected') => {
    const notes = status === 'Approved' ? 'Approved by admin.' : rejectionNotes;
    mutation.mutate({ requestId: request.request_id, status, notes });
  };

  const handleRejectClick = (request: AdminInvestmentWithdrawalRequest) => {
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Investment Withdrawal Requests</CardTitle>
          <CardDescription>Review and process user requests to withdraw active investments.</CardDescription>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search by user name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-[300px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan & Amounts</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(PAGE_SIZE)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))
                ) : (
                  requests?.map((request) => (
                    <TableRow key={request.request_id}>
                      <TableCell>
                        <Button variant="link" className="p-0 h-auto" onClick={() => handleViewUser(request.user_id)}>
                          {request.user_name}
                        </Button>
                        <p className="text-xs text-muted-foreground">{request.user_email}</p>
                      </TableCell>
                      <TableCell>
                        {request.plan_name}
                        <p className="text-sm font-semibold text-primary">
                          Request: ₹{request.requested_amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Principal: ₹{request.investment_amount.toLocaleString('en-IN')}
                        </p>
                      </TableCell>
                      <TableCell>{format(new Date(request.requested_at), "PPP p")}</TableCell>
                      <TableCell><Badge variant={request.status === "Approved" ? "success" : request.status === "Pending" ? "outline" : "destructive"}>{request.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {request.reason && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost"><Info className="h-4 w-4" /></Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p><strong>User's Reason:</strong> {request.reason}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {request.status === 'Pending' && (
                            <>
                              <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleProcessRequest(request, 'Approved')} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleRejectClick(request)} disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
          {pageCount > 1 && (
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
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!rejectionRequest} onOpenChange={() => setRejectionRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Investment Withdrawal?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this request. This note will be visible to the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="rejection-notes">Rejection Notes (Required)</Label>
            <Textarea id="rejection-notes" placeholder="e.g., Investment has not met minimum holding period..." value={rejectionNotes} onChange={(e) => setRejectionNotes(e.target.value)} className="mt-2" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRejection} disabled={mutation.isPending}>
              {mutation.isPending ? "Processing..." : "Confirm Rejection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InvestmentWithdrawalManagement;