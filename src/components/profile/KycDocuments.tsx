import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileUp, AlertCircle } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { KycDocument } from "@/types/database";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "../ui/skeleton";

// --- API Functions ---

const fetchKycDocuments = async (userId: string): Promise<KycDocument[]> => {
  const { data, error } = await supabase
    .from("kyc_documents")
    .select("id, document_type, file_path, status, submitted_at")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

const uploadKycDocument = async ({ userId, file, documentType }: { userId: string; file: File; documentType: string }) => {
  if (!file) throw new Error("No file selected.");

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${documentType.replace(/\s/g, '_')}-${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("kyc_documents")
    .upload(filePath, file);

  if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

  // 2. Insert record into the database
  const { error: dbError } = await supabase
    .from("kyc_documents")
    .insert({
      user_id: userId,
      document_type: documentType,
      file_path: filePath,
      status: 'Pending',
    });

  if (dbError) throw new Error(`Database Error: ${dbError.message}`);
  
  // 3. Update profile status
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ kyc_status: 'Pending Review' })
    .eq('id', userId);

  if (profileError) throw new Error(`Profile Update Error: ${profileError.message}`);

  return { filePath };
};


// --- Component ---

const KycDocuments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);

  const { data: documents, isLoading } = useQuery<KycDocument[]>({
    queryKey: ["kycDocuments", user?.id],
    queryFn: () => fetchKycDocuments(user!.id),
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: uploadKycDocument,
    onSuccess: (data, variables) => {
      toast.success(`${variables.documentType} uploaded successfully!`);
      queryClient.invalidateQueries({ queryKey: ["kycDocuments", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      if (variables.documentType === 'Aadhaar Card') setAadhaarFile(null);
      if (variables.documentType === 'PAN Card') setPanFile(null);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const handleUpload = (documentType: 'Aadhaar Card' | 'PAN Card') => {
    const file = documentType === 'Aadhaar Card' ? aadhaarFile : panFile;
    if (!user || !file) {
      toast.error("Please select a file to upload.");
      return;
    }
    mutation.mutate({ userId: user.id, file, documentType });
  };

  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Upload KYC Documents</CardTitle>
          <CardDescription>
            Upload your documents for verification. Ensure files are clear and legible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="aadhaar">Aadhaar Card (Front & Back)</Label>
            <div className="flex items-center gap-2">
              <Input id="aadhaar" type="file" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
              <Button onClick={() => handleUpload('Aadhaar Card')} disabled={!aadhaarFile || mutation.isPending}>
                <FileUp className="mr-2 h-4 w-4" /> Upload
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pan">PAN Card</Label>
            <div className="flex items-center gap-2">
              <Input id="pan" type="file" onChange={(e) => setPanFile(e.target.files?.[0] || null)} />
              <Button onClick={() => handleUpload('PAN Card')} disabled={!panFile || mutation.isPending}>
                <FileUp className="mr-2 h-4 w-4" /> Upload
              </Button>
            </div>
          </div>
          
          {mutation.isPending && <p className="text-sm text-muted-foreground">Uploading file, please wait...</p>}

          <div className="mt-4 flex items-start rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-900 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200">
            <AlertCircle className="mr-3 h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              Your KYC status is currently <span className="font-semibold">Pending Review</span>. Verification may take up to 48 hours after submission.
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Submitted Documents</CardTitle>
          <CardDescription>History of your submitted documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(2)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : documents && documents.length > 0 ? (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.document_type}</TableCell>
                    <TableCell>{format(new Date(doc.submitted_at), "PPP")}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          doc.status === "Approved"
                            ? "default"
                            : doc.status === "Pending"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        {doc.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">No documents submitted yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default KycDocuments;