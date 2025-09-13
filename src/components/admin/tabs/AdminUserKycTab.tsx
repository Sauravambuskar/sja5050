import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { KycViewerDialog } from "@/components/admin/KycViewerDialog";
import { AdminKycRequest } from "@/types/database";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const fetchUserKycDocs = async (userId: string): Promise<AdminKycRequest[]> => {
  const { data, error } = await supabase.rpc('get_user_kyc_documents_for_admin', { user_id_to_fetch: userId });
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

const sendKycEmail = async ({ to, name, status, notes }: { to: string; name: string; status: string; notes: string }) => {
  const subject = `Your KYC Document has been ${status}`;
  const html = status === 'Approved'
    ? `<p>Hi ${name},</p><p>Your KYC document has been successfully reviewed and approved.</p><p>Thank you for choosing SJA Foundation.</p>`
    : `<p>Hi ${name},</p><p>Your KYC document has been rejected.</p><p>Reason: ${notes}</p><p>Please log in to your account to re-upload the correct document. Contact support if you have any questions.</p>`;

  const { error } = await supabase.functions.invoke('send-transactional-email', { body: { to, subject, html } });
  if (error) {
    console.error("Failed to send KYC email:", error);
    toast.warning("KYC status updated, but the confirmation email could not be sent.");
  }
};

export const AdminUserKycTab = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [viewingRequest, setViewingRequest] = useState<AdminKycRequest | null>(null);
  const [rejectionRequest, setRejectionRequest] = useState<AdminKycRequest | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ['userKycDocsForAdmin', userId],
    queryFn: () => fetchUserKycDocs(userId),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: processKycRequest,
    onSuccess: (_, variables) => {
      toast.success(`Request has been ${variables.status.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['userKycDocsForAdmin', userId] });
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['userProfileForAdmin', userId] });

      const request = documents?.find(r => r.request_id === variables.requestId);
      if (request && request.user_email) {
        sendKycEmail({
          to: request.user_email,
          name: request.user_name,
          status: variables.status,
          notes: variables.notes,
        });
      }

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

  return (
    <>
      <Card>
        <CardHeader><CardTitle>KYC Documents</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Type</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(2)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : documents && documents.length > 0 ? (
                documents.map((doc) => (
                  <TableRow key={doc.request_id}>
                    <TableCell>
                      <div className="font-medium">{doc.document_type}</div>
                      {doc.status === 'Rejected' && doc.admin_notes && (<p className="text-xs text-destructive mt-1">Note: {doc.admin_notes}</p>)}
                    </TableCell>
                    <TableCell>{format(new Date(doc.submitted_at), "PPP")}</TableCell>
                    <TableCell><Badge variant={doc.status === "Approved" ? "default" : doc.status === "Pending" ? "outline" : "destructive"}>{doc.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost" disabled={mutation.isPending}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingRequest(doc)}>
                            <Eye className="mr-2 h-4 w-4" /> View Document
                          </DropdownMenuItem>
                          {doc.status === 'Pending' && (
                            <>
                              <DropdownMenuItem className="text-green-600" onClick={() => handleProcessRequest(doc.request_id, 'Approved', 'Document verified.')}>
                                <CheckCircle className="mr-2 h-4 w-4" />Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleRejectClick(doc)}>
                                <XCircle className="mr-2 h-4 w-4" />Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">No KYC documents submitted.</TableCell></TableRow>
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