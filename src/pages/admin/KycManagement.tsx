import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminKycOverview } from "@/types/database";
import { useDebounce } from "@/hooks/useDebounce";
import { keepTrying } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KycViewerDialog } from "@/components/admin/KycViewerDialog";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const PAGE_SIZE = 10;
const DOCUMENT_TYPES = ["Aadhaar Front", "Aadhaar Back", "PAN", "Selfie", "Voter ID", "Driving License", "Bank Statement"];

const fetchKycOverview = async (page: number, searchTerm: string, status: string): Promise<{ data: AdminKycOverview[], count: number }> => {
  const { data, error } = await supabase.rpc('get_admin_kyc_overview', {
    p_page: page,
    p_limit: PAGE_SIZE,
    p_search_text: searchTerm || null,
    p_status_filter: status === 'all' ? null : status,
  });

  const { data: countData, error: countError } = await supabase.rpc('get_admin_kyc_overview_count', {
    p_search_text: searchTerm || null,
    p_status_filter: status === 'all' ? null : status,
  });

  if (error) throw new Error(`Error fetching KYC overview: ${error.message}`);
  if (countError) throw new Error(`Error fetching KYC count: ${countError.message}`);

  return { data: data || [], count: countData || 0 };
};

const processKyc = async ({ userId, status, notes }: { userId: string, status: 'Approved' | 'Rejected', notes: string }) => {
  const { error } = await supabase.rpc('admin_process_user_kyc', {
    p_user_id: userId,
    p_new_status: status,
    p_admin_notes: notes,
  });
  if (error) throw new Error(error.message);
};

const KycManagement = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [viewingDoc, setViewingDoc] = useState<{ user: AdminKycOverview, docType: string, path: string } | null>(null);
  const [actionUser, setActionUser] = useState<{ user: AdminKycOverview, action: 'Approved' | 'Rejected' } | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['adminKycOverview', currentPage, debouncedSearchTerm, statusFilter],
    queryFn: () => fetchKycOverview(currentPage, debouncedSearchTerm, statusFilter),
    placeholderData: keepPreviousData,
  });

  const kycMutation = useMutation({
    mutationFn: processKyc,
    onSuccess: (_, variables) => {
      toast.success(`User KYC has been ${variables.status.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['adminKycOverview'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => {
      setActionUser(null);
      setRejectionNotes("");
    }
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleActionConfirm = () => {
    if (!actionUser) return;
    if (actionUser.action === 'Rejected' && !rejectionNotes) {
      toast.error("Rejection notes are required.");
      return;
    }
    kycMutation.mutate({ userId: actionUser.user.user_id, status: actionUser.action, notes: rejectionNotes });
  };

  const KycThumbnail = ({ path, user, docType }: { path: string | null, user: AdminKycOverview, docType: string }) => {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (path) {
        setLoading(true);
        keepTrying(() => supabase.storage.from('kyc_documents').createSignedUrl(path, 60))
          .then(({ data }) => {
            if (data) setUrl(data.signedUrl);
          })
          .catch(() => { /* error handled by keepTrying */ })
          .finally(() => setLoading(false));
      }
    }, [path]);

    if (!path) return <span className="text-muted-foreground text-xs">null</span>;
    if (loading) return <Skeleton className="h-12 w-16" />;
    if (!url) return <div className="h-12 w-16 bg-destructive/20 text-destructive text-xs flex items-center justify-center">Error</div>;

    return (
      <button onClick={() => setViewingDoc({ user, docType, path })}>
        <img src={url} alt={docType} className="h-12 w-16 object-cover rounded-sm border" />
      </button>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>KYC Management</CardTitle>
          <CardDescription>Review and manage user KYC submissions.</CardDescription>
          <div className="mt-4 flex flex-col gap-4 md:flex-row">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Not Submitted">Not Submitted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Aadhaar No.</TableHead>
                  <TableHead>PAN No.</TableHead>
                  <TableHead>Status</TableHead>
                  {DOCUMENT_TYPES.map(doc => <TableHead key={doc}>{doc}</TableHead>)}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(PAGE_SIZE)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      {DOCUMENT_TYPES.map(doc => <TableCell key={doc}><Skeleton className="h-12 w-16" /></TableCell>)}
                      <TableCell className="text-right"><Skeleton className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow><TableCell colSpan={12} className="h-24 text-center text-destructive">Error: {error.message}</TableCell></TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="h-24 text-center">No users found.</TableCell></TableRow>
                ) : (
                  data?.data.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>{user.aadhaar_number || 'N/A'}</TableCell>
                      <TableCell>{user.pan_number || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === "Approved" ? "default" : user.status === "Pending" ? "outline" : "destructive"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      {DOCUMENT_TYPES.map(docType => (
                        <TableCell key={docType}>
                          <KycThumbnail path={user[docType as keyof AdminKycOverview] as string | null} user={user} docType={docType} />
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        {user.status === 'Pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => setActionUser({ user, action: 'Approved' })}>
                              <CheckCircle className="h-4 w-4 mr-2" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setActionUser({ user, action: 'Rejected' })}>
                              <XCircle className="h-4 w-4 mr-2" /> Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalCount={data?.count || 0}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>

      {viewingDoc && (
        <KycViewerDialog
          isOpen={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
          request={{
            request_id: '', // Not needed for viewer
            user_id: viewingDoc.user.user_id,
            user_name: viewingDoc.user.full_name,
            user_email: viewingDoc.user.email,
            document_type: viewingDoc.docType,
            file_path: viewingDoc.path,
            submitted_at: '', // Not needed
            status: viewingDoc.user.status,
            admin_notes: null
          }}
        />
      )}

      <AlertDialog open={!!actionUser} onOpenChange={(open) => !open && setActionUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm KYC {actionUser?.action}</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {actionUser?.action?.toLowerCase()} the KYC for <strong>{actionUser?.user.full_name}</strong>.
              {actionUser?.action === 'Rejected' && (
                <Textarea
                  placeholder="Please provide rejection notes (required)..."
                  className="mt-4"
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                />
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActionConfirm}
              disabled={kycMutation.isPending}
              className={actionUser?.action === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {kycMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Confirm ${actionUser?.action}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default KycManagement;