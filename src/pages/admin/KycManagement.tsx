import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, CheckCircle, XCircle, Eye } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminKycRequest } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";

const STORAGE_URL = "https://lqlvkyuyrwsmstooqbed.supabase.co/storage/v1/object/public/kyc_documents/";

const fetchKycRequests = async (): Promise<AdminKycRequest[]> => {
  const { data, error } = await supabase.rpc('get_all_kyc_requests');
  if (error) throw new Error(error.message);
  return data;
};

const processKycRequest = async ({ requestId, status, notes }: { requestId: string; status: 'Approved' | 'Rejected'; notes: string }) => {
  const { error } = await supabase.rpc('process_kyc_request', {
    request_id_to_process: requestId,
    new_status: status,
    admin_notes_text: notes,
  });
  if (error) throw new Error(error.message);
};

const KycManagement = () => {
  const queryClient = useQueryClient();
  const { data: kycRequests, isLoading, isError, error } = useQuery<AdminKycRequest[]>({
    queryKey: ['allKycRequests'],
    queryFn: fetchKycRequests,
  });

  const mutation = useMutation({
    mutationFn: processKycRequest,
    onSuccess: (_, variables) => {
      toast.success(`Request has been ${variables.status.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['allKycRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
    },
    onError: (error) => {
      toast.error(`Action failed: ${error.message}`);
    },
  });

  const handleProcessRequest = (requestId: string, status: 'Approved' | 'Rejected') => {
    const notes = status === 'Rejected' ? 'Document not clear.' : 'Document verified.';
    mutation.mutate({ requestId, status, notes });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>KYC Toolkit</CardTitle>
        <CardDescription>Review and process client KYC submissions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Document Type</TableHead>
              <TableHead>Submitted Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
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
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow><TableCell colSpan={5} className="text-center text-red-500">Error: {error.message}</TableCell></TableRow>
            ) : (
              kycRequests?.map((request) => (
                <TableRow key={request.request_id}>
                  <TableCell className="font-medium">{request.user_name}</TableCell>
                  <TableCell>{request.document_type}</TableCell>
                  <TableCell>{format(new Date(request.submitted_at), "PPP")}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        request.status === "Approved"
                          ? "default"
                          : request.status === "Pending"
                          ? "outline"
                          : "destructive"
                      }
                    >
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" disabled={request.status !== 'Pending' || mutation.isPending}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a href={`${STORAGE_URL}${request.file_path}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="mr-2 h-4 w-4" /> View Document
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-green-600"
                          onClick={() => handleProcessRequest(request.request_id, 'Approved')}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleProcessRequest(request.request_id, 'Rejected')}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
export default KycManagement;