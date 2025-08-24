import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle } from "lucide-react";
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

type InvestmentRequest = {
  request_id: string;
  user_name: string;
  user_id: string;
  plan_name: string;
  amount: number;
  requested_at: string;
  status: string;
  admin_notes: string | null;
};

const PAGE_SIZE = 10;

const fetchInvestmentRequests = async (page: number, statusFilter: string | null): Promise<InvestmentRequest[]> => {
  const { data, error } = await supabase.rpc('get_all_investment_requests', {
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
    p_status_filter: statusFilter,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchInvestmentRequestsCount = async (statusFilter: string | null): Promise<number> => {
  const { data, error } = await supabase.rpc('get_all_investment_requests_count', {
    p_status_filter: statusFilter,
  });
  if (error) throw new Error(error.message);
  return data;
};

const processRequest = async ({ requestId, status, notes }: { requestId: string; status: 'Approved' | 'Rejected'; notes: string }) => {
  const { error } = await supabase.rpc('process_investment_request', {
    p_request_id: requestId,
    p_new_status: status,
    p_notes: notes,
  });
  if (error) throw new Error(error.message);
};

const InvestmentRequestManagement = () => {
  const queryClient = useQueryClient();
  const { handleViewUser } = usePageLayoutContext();
  const [rejectionRequest, setRejectionRequest] = useState<InvestmentRequest | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("Pending");

  const filterValue = statusFilter === 'all' ? null : statusFilter;

  const { data: requests, isLoading } = useQuery<InvestmentRequest[]>({
    queryKey: ['allInvestmentRequests', currentPage, filterValue],
    queryFn: () => fetchInvestmentRequests(currentPage, filterValue),
    placeholderData: keepPreviousData,
  });

  const { data: totalRequests } = useQuery<number>({
    queryKey: ['allInvestmentRequestsCount', filterValue],
    queryFn: () => fetchInvestmentRequestsCount(filterValue),
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
    onSuccess: (_, variables) => {
      toast.success(`Request has been ${variables.status.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['allInvestmentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allInvestmentRequestsCount'] });
      queryClient.invalidateQueries({ queryKey: ['allInvestments'] });
    },
    onError: (error) => {
      toast.error(`Action failed: ${error.message}`);
    },
    onSettled: () => {
      setRejectionRequest(null);
      setRejectionNotes("");
    }
  });

  const handleProcessRequest = (request: InvestmentRequest, status: 'Approved' | 'Rejected') => {
    const notes = status === 'Approved' ? 'Approved by admin.' : rejectionNotes;
    mutation.mutate({ requestId: request.request_id, status, notes });
  };

  const handleRejectClick = (request: InvestmentRequest) => {
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
          <CardTitle>Investment Requests</CardTitle>
          <CardDescription>Review and process direct investment requests from users.</CardDescription>
          <div className="mt-4">
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
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Requested Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(PAGE_SIZE)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              ) : (
                requests?.map((request) => (
                  <TableRow key={request.request_id}>
                    <TableCell>
                      <Button variant="link" className="p-0 h-auto" onClick={() => handleViewUser(request.user_id)}>
                        {request.user_name}
                      </Button>
                    </TableCell>
                    <TableCell>{request.plan_name}</TableCell>
                    <TableCell>₹{request.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>{format(new Date(request.requested_at), "PPP p")}</TableCell>
                    <TableCell><Badge variant={request.status === "Approved" ? "success" : request.status === "Pending" ? "outline" : "destructive"}>{request.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {request.status === 'Pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleProcessRequest(request, 'Approved')} disabled={mutation.isPending}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleRejectClick(request)} disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
            <AlertDialogTitle>Reject Investment Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this request. This note will be visible to the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="rejection-notes">Rejection Notes (Required)</Label>
            <Textarea id="rejection-notes" placeholder="e.g., Insufficient proof of payment..." value={rejectionNotes} onChange={(e) => setRejectionNotes(e.target.value)} className="mt-2" />
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

export default InvestmentRequestManagement;