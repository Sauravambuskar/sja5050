import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserInvestmentCancellationRequest } from "@/types/database"; // Fix: Correct type name
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Search, XCircle, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { useDebounce } from "@/hooks/useDebounce";

interface CancellationRequestsTabProps {
  statusFilter: string;
}

const fetchRequests = async (
  page: number,
  status: string,
  search: string
): Promise<{ data: UserInvestmentCancellationRequest[]; count: number }> => {
  const limit = 10;
  const offset = (page - 1) * limit;

  // Fetch data
  const { data, error } = await supabase.rpc(
    "get_all_investment_cancellation_requests",
    {
      p_status_filter: status === "All" ? null : status,
      p_search_text: search || null,
      p_limit: limit,
      p_offset: offset,
    }
  );

  if (error) throw error;

  // Fetch count separately
  const { data: countData, error: countError } = await supabase.rpc(
    "get_all_investment_cancellation_requests_count",
    {
      p_status_filter: status === "All" ? null : status,
      p_search_text: search || null,
    }
  );

  if (countError) throw countError;

  const totalCount = countData as number; // The RPC function returns a bigint directly

  return { data: data || [], count: totalCount };
};

const processRequest = async ({
  requestId,
  newStatus,
  adminNotes,
}: {
  requestId: string;
  newStatus: string;
  adminNotes: string;
}) => {
  const { error } = await supabase.rpc("process_investment_cancellation_request", {
    p_request_id: requestId,
    p_new_status: newStatus,
    p_admin_notes: adminNotes,
  });
  if (error) throw error;
};

export const CancellationRequestsTab = ({ statusFilter }: CancellationRequestsTabProps) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedRequest, setSelectedRequest] = useState<UserInvestmentCancellationRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [dialogStatus, setDialogStatus] = useState<"Approved" | "Rejected" | null>(null);

  const status = statusFilter;

  const {
    data: requestsData,
    isLoading,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["investmentCancellationRequests", page, status, debouncedSearch],
    queryFn: () => fetchRequests(page, status, debouncedSearch),
    placeholderData: keepPreviousData,
  });

  const processMutation = useMutation({
    mutationFn: processRequest,
    onSuccess: () => {
      toast.success("Request processed successfully!");
      queryClient.invalidateQueries({ queryKey: ["investmentCancellationRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboardStats"] });
      setSelectedRequest(null);
      setAdminNotes("");
      setDialogStatus(null);
    },
    onError: (error) => {
      toast.error(`Failed to process request: ${error.message}`);
    },
  });

  const handleProcess = (newStatus: "Approved" | "Rejected") => {
    if (!selectedRequest) return;
    setDialogStatus(newStatus);
  };

  const confirmProcess = () => {
    if (selectedRequest && dialogStatus) {
      processMutation.mutate({
        requestId: selectedRequest.request_id,
        newStatus: dialogStatus,
        adminNotes: adminNotes,
      });
    }
  };

  const totalPages = requestsData ? Math.ceil(requestsData.count / 10) : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search by user name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Investment Amount</TableHead>
            <TableHead>Cancellation Amount</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Requested At</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading || isPlaceholderData ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </TableCell>
            </TableRow>
          ) : requestsData?.data && requestsData.data.length > 0 ? (
            requestsData.data.map((request) => (
              <TableRow key={request.request_id}>
                <TableCell>
                  <div className="font-medium">{request.user_name}</div>
                  <div className="text-sm text-muted-foreground">{request.user_email}</div>
                </TableCell>
                <TableCell>{request.plan_name}</TableCell>
                <TableCell>₹{request.investment_amount.toLocaleString('en-IN')}</TableCell>
                <TableCell>₹{request.cancellation_amount.toLocaleString('en-IN')}</TableCell>
                <TableCell className="max-w-[200px] truncate">{request.reason}</TableCell>
                <TableCell>{new Date(request.requested_at).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={request.status === "Pending" ? "secondary" : request.status === "Approved" ? "default" : "destructive"}>
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {request.status === "Pending" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setAdminNotes("");
                          setDialogStatus("Approved");
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" /> Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setAdminNotes("");
                          setDialogStatus("Rejected");
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center">No cancellation requests found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        hasPreviousPage={page > 1}
        hasNextPage={page < totalPages}
      />

      <Dialog open={!!selectedRequest && !!dialogStatus} onOpenChange={() => { setSelectedRequest(null); setDialogStatus(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogStatus} Investment Cancellation Request</DialogTitle>
            <DialogDescription>
              You are about to {dialogStatus === "Approved" ? "approve" : "reject"} the cancellation request for{" "}
              <span className="font-semibold">{selectedRequest?.user_name}</span> (Plan:{" "}
              <span className="font-semibold">{selectedRequest?.plan_name}</span>, Amount:{" "}
              <span className="font-semibold">₹{selectedRequest?.cancellation_amount.toLocaleString('en-IN')}</span>).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p>Please provide any notes for this action:</p>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Enter notes here (e.g., reason for rejection, details of approval)"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedRequest(null); setDialogStatus(null); }}>Cancel</Button>
            <Button onClick={confirmProcess} disabled={processMutation.isPending}>
              {processMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {dialogStatus}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};