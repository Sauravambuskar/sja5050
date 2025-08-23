import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, CheckCircle, XCircle, Eye, Download } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminKycRequest } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { KycViewerDialog } from "@/components/admin/KycViewerDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { exportToCsv } from "@/lib/utils";

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
  const [viewingRequest, setViewingRequest] = useState<AdminKycRequest | null>(null);
  const [rejectionRequest, setRejectionRequest] = useState<AdminKycRequest | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");

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
      setRejectionRequest(null);
    },
    onError: (error) => {
      toast.error(`Action failed: ${error.message}`);
    },
  });

  const handleProcessRequest = (requestId: string, status: 'Approved' | 'Rejected', notes: string) => {
    mutation.mutate({ requestId, status, notes });
  };

  const handleRejectClick = (request: AdminKycRequest) => {
    setRejectionNotes("");
    setRejectionRequest(request);
  };

  const handleConfirmRejection = () => {
    if (!rejectionRequest) return;
    if (rejectionNotes.trim().length < 10) {
      toast.error("Please provide a clear reason for rejection (min. 10 characters).");
      return;
    }
    handleProcessRequest(rejectionRequest.request_id, 'Rejected', rejectionNotes);
  };

  const handleExport = () => {
    if (!kycRequests || kycRequests.length === 0) {
      toast.warning("No KYC data to export.");
      return;
    }
    const dataToExport = kycRequests.map(req => ({
      RequestID: req.request_id,
      UserID: req.user_id,
      UserName: req.user_name,
      DocumentType: req.document_type,
      SubmittedAt: format(new Date(req.submitted_at), 'yyyy-MM-dd HH:mm'),
      Status: req.status,
    }));
    const filename = `kyc_requests_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    exportToCsv(filename, dataToExport);
    toast.success("KYC data exported successfully.");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>KYC Toolkit</CardTitle>
              <CardDescription>Review and process client KYC submissions.</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
            </Button>
          </div>
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
                          <Button aria-haspopup="true" size="icon" variant="ghost" disabled={mutation.isPending}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingRequest(request)}>
                            <Eye className="mr-2 h-4 w-4" /> View Document
                          </DropdownMenuItem>
                          {request.status === 'Pending' && (
                            <>
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() => handleProcessRequest(request.request_id, 'Approved', 'Document verified.')}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleRejectClick(request)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
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
      <KycViewerDialog
        request={viewingRequest}
        isOpen={!!viewingRequest}
        onClose={() => setViewingRequest(null)}
      />
      <AlertDialog open={!!rejectionRequest} onOpenChange={() => setRejectionRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject KYC Submission?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this document. This note will be visible to the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-notes">Rejection Notes</Label>
            <Textarea
              id="rejection-notes"
              placeholder="e.g., Document is expired, photo is not clear..."
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRejection} disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting..." : "Confirm Rejection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export default KycManagement;