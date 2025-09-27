import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

interface AdminUserKycTabProps {
  userId: string;
}

export function AdminUserKycTab({ userId }: AdminUserKycTabProps) {
  const { data: kycDocuments, isLoading } = useQuery({
    queryKey: ['userKycDocuments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_kyc_documents_for_admin', { user_id_to_fetch: userId });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!kycDocuments || kycDocuments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>KYC Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No KYC documents found for this user.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>KYC Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Admin Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kycDocuments.map((doc: any) => (
                <TableRow key={doc.request_id}>
                  <TableCell>{doc.document_type}</TableCell>
                  <TableCell>
                    <Badge variant={doc.status === 'Approved' ? 'default' : doc.status === 'Rejected' ? 'destructive' : 'outline'}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(doc.submitted_at).toLocaleString()}</TableCell>
                  <TableCell>{doc.admin_notes || 'N/A'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => window.open(doc.file_path, '_blank')}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}