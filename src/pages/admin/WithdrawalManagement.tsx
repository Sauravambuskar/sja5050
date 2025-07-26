import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminWithdrawalRequest } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";

const fetchWithdrawalRequests = async (): Promise<AdminWithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_all_withdrawal_requests');
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

const WithdrawalManagement = () => {
  const queryClient = useQueryClient();
  const { data: requests, isLoading, isError, error } = useQuery<AdminWithdrawalRequest[]>({
    queryKey: ['allWithdrawalRequests'],
    queryFn: fetchWithdrawalRequests,
  });

  const mutation = useMutation({
    mutationFn: processRequest,
    onSuccess: (data, variables) => {
      toast.success(`Request has been ${variables.status.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['allWithdrawalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] }); // Refresh dashboard stats
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] }); // Refresh user wallet balance
    },
    onError: (error) => {
      toast.error(`Action failed: ${error.message}`);
    },
  });

  const handleProcessRequest = (requestId: string, status: 'Completed' | 'Rejected') => {
    const notes = status === 'Completed' ? 'Approved by admin.' : 'Rejected by admin.';
    mutation.mutate({ requestId, status, notes });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawal Management</CardTitle>
        <CardDescription>Review and process all user withdrawal requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Requested Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow><TableCell colSpan={5} className="text-center text-red-500">Error: {error.message}</TableCell></TableRow>
            ) : (
              requests?.map((request) => (
                <TableRow key={request.request_id}>
                  <TableCell className="font-medium">{request.user_name}</TableCell>
                  <TableCell>₹{request.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>{format(new Date(request.requested_at), "PPP")}</TableCell>
                  <TableCell>
                    <Badge variant={
                      request.status === "Completed" ? "default"
                      : request.status === "Pending" ? "outline"
                      : "destructive"
                    }>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === 'Pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() => handleProcessRequest(request.request_id, 'Completed')}
                          disabled={mutation.isPending}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleProcessRequest(request.request_id, 'Rejected')}
                          disabled={mutation.isPending}
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Reject
                        </Button>
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
  );
};
export default WithdrawalManagement;