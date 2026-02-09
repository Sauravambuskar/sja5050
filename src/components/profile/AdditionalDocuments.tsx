import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, Upload, Trash2, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { AdditionalDocument } from '@/types/database';
import { format } from 'date-fns';

const fetchAdditionalDocuments = async (userId: string): Promise<AdditionalDocument[]> => {
  const { data, error } = await supabase
    .from('user_additional_documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const AdditionalDocuments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [documentName, setDocumentName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['additionalDocuments', user?.id],
    queryFn: () => fetchAdditionalDocuments(user!.id),
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !documentName.trim() || !user) throw new Error('File and document name are required.');

      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('additional_documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('user_additional_documents').insert({
        user_id: user.id,
        document_name: documentName.trim(),
        file_path: filePath,
        uploaded_by: user.id,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['additionalDocuments', user?.id] });
      setDocumentName('');
      setFile(null);
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: AdditionalDocument) => {
      const { error: storageError } = await supabase.storage
        .from('additional_documents')
        .remove([doc.file_path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('user_additional_documents')
        .delete()
        .eq('id', doc.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success('Document deleted.');
      queryClient.invalidateQueries({ queryKey: ['additionalDocuments', user?.id] });
    },
    onError: (error: Error) => {
      toast.error(`Deletion failed: ${error.message}`);
    },
  });

  const handleDownload = async (filePath: string) => {
    const { data, error } = await supabase.storage.from('additional_documents').download(filePath);
    if (error) {
      toast.error(`Download failed: ${error.message}`);
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nominee Documets</CardTitle>
        <CardDescription>Upload and manage other relevant documents here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 rounded-md border p-4">
          <h3 className="font-semibold">Upload New Document</h3>
          <div className="space-y-2">
            <Input
              placeholder="Document Name (e.g., Address Proof)"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              disabled={uploadMutation.isPending}
            />
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              disabled={uploadMutation.isPending}
            />
          </div>
          <Button onClick={() => uploadMutation.mutate()} disabled={!file || !documentName.trim() || uploadMutation.isPending}>
            {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload Document
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Uploaded Documents</h3>
          {isLoading ? (
            <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : documents && documents.length > 0 ? (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.document_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded on {format(new Date(doc.uploaded_at), 'PPP')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleDownload(doc.file_path)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate(doc)} disabled={deleteMutation.isPending && deleteMutation.variables?.id === doc.id}>
                      {deleteMutation.isPending && deleteMutation.variables?.id === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm text-muted-foreground">No additional documents uploaded.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};