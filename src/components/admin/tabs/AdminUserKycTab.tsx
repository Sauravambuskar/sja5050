import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useState } from "react";
import { KycViewerDialog } from "@/components/admin/KycViewerDialog";
import { AdminKycRequest } from "@/types/database";

const fetchUserKycDocs = async (userId: string): Promise<AdminKycRequest[]> => {
  const { data, error } = await supabase.rpc('get_user_kyc_documents_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  return data;
};

export const AdminUserKycTab = ({ userId }: { userId: string }) => {
  const [viewingRequest, setViewingRequest] = useState<AdminKycRequest | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['userKycDocsForAdmin', userId],
    queryFn: () => fetchUserKycDocs(userId),
    enabled: !!userId,
  });

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
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
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
                      <Button variant="ghost" size="icon" onClick={() => setViewingRequest(doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
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
    </>
  );
};