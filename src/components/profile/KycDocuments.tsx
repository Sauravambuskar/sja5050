import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileUp, AlertCircle, CheckCircle, XCircle, Info } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { KycDocument } from "@/types/database";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";
import { VideoKyc } from "./VideoKyc";

// --- Constants ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];

// --- API Functions ---

const fetchKycDocuments = async (userId: string): Promise<KycDocument[]> => {
  const { data, error } = await supabase
    .from("kyc_documents")
    .select("id, document_type, file_path, status, submitted_at, admin_notes")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

const fetchProfileStatus = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("kyc_status")
    .eq("id", userId)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
};

const uploadKycDocument = async ({ userId, file, documentType }: { userId: string; file: File; documentType: string }) => {
  if (!file) throw new Error("No file selected.");

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${documentType.replace(/\s/g, '_')}-${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from("kyc_documents").upload(filePath, file);
  if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

  const { error: dbError } = await supabase.from("kyc_documents").insert({ user_id: userId, document_type: documentType, file_path: filePath, status: 'Pending' });
  if (dbError) throw new Error(`Database Error: ${dbError.message}`);
  
  const { error: profileError } = await supabase.from('profiles').update({ kyc_status: 'Pending Review' }).eq('id', userId);
  if (profileError) throw new Error(`Profile Update Error: ${profileError.message}`);

  return { filePath };
};

// --- Component ---

const KycDocuments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);

  const { data: documents, isLoading: docsLoading } = useQuery<KycDocument[]>({
    queryKey: ["kycDocuments", user?.id],
    queryFn: () => fetchKycDocuments(user!.id),
    enabled: !!user,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profileStatus", user?.id],
    queryFn: () => fetchProfileStatus(user!.id),
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: uploadKycDocument,
    onSuccess: (data, variables) => {
      toast.success(`${variables.documentType} uploaded successfully!`);
      queryClient.invalidateQueries({ queryKey: ["kycDocuments", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profileStatus", user?.id] });
      if (variables.documentType === 'Aadhaar Card') setAadhaarFile(null);
      if (variables.documentType === 'PAN Card') setPanFile(null);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum size is 5MB.");
      event.target.value = ""; // Clear the input
      setFile(null);
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please upload a JPG, PNG, or PDF.");
      event.target.value = ""; // Clear the input
      setFile(null);
      return;
    }

    setFile(file);
  };

  const handleUpload = (documentType: 'Aadhaar Card' | 'PAN Card') => {
    const file = documentType === 'Aadhaar Card' ? aadhaarFile : panFile;
    if (!user || !file) {
      toast.error("Please select a file to upload.");
      return;
    }
    mutation.mutate({ userId: user.id, file, documentType });
  };

  const getStatusBanner = (status: string | null | undefined) => {
    switch (status) {
      case 'Approved': return { icon: CheckCircle, color: "green", text: "Your KYC has been successfully approved!" };
      case 'Rejected': return { icon: XCircle, color: "red", text: "Your KYC has been rejected. Please review the notes on your documents and re-upload." };
      case 'Pending Review': return { icon: AlertCircle, color: "yellow", text: "Your documents are under review. Verification may take up to 48 hours." };
      default: return { icon: Info, color: "blue", text: "Please upload your documents to begin the KYC verification process." };
    }
  };

  const kycStatus = profile?.kyc_status;
  const bannerInfo = getStatusBanner(kycStatus);
  const colorVariants = {
    green: "border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200",
    red: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200",
    blue: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200",
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 pt-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload KYC Documents</CardTitle>
            <CardDescription>Upload your documents for verification. Max 5MB. (JPG, PNG, PDF)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2"><Label htmlFor="aadhaar">Aadhaar Card (Front & Back)</Label><div className="flex items-center gap-2"><Input id="aadhaar" type="file" onChange={(e) => handleFileChange(e, setAadhaarFile)} /><Button onClick={() => handleUpload('Aadhaar Card')} disabled={!aadhaarFile || mutation.isPending}><FileUp className="mr-2 h-4 w-4" /> Upload</Button></div></div>
            <div className="space-y-2"><Label htmlFor="pan">PAN Card</Label><div className="flex items-center gap-2"><Input id="pan" type="file" onChange={(e) => handleFileChange(e, setPanFile)} /><Button onClick={() => handleUpload('PAN Card')} disabled={!panFile || mutation.isPending}><FileUp className="mr-2 h-4 w-4" /> Upload</Button></div></div>
            {mutation.isPending && <p className="text-sm text-muted-foreground">Uploading file, please wait...</p>}
            {profileLoading ? <Skeleton className="h-12 w-full" /> : (
              <div className={cn("mt-4 flex items-start rounded-md border p-4", colorVariants[bannerInfo.color])}><bannerInfo.icon className="mr-3 h-5 w-5 flex-shrink-0" /><p className="text-sm">{bannerInfo.text}</p></div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Submitted Documents</CardTitle><CardDescription>History of your submitted documents.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Document Name</TableHead><TableHead>Submission Date</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {docsLoading ? ([...Array(2)].map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell><Skeleton className="h-5 w-28" /></TableCell><TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto" /></TableCell></TableRow>))) : documents && documents.length > 0 ? (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="font-medium">{doc.document_type}</div>
                        {doc.status === 'Rejected' && doc.admin_notes && (<p className="text-xs text-destructive mt-1">Note: {doc.admin_notes}</p>)}
                      </TableCell>
                      <TableCell>{format(new Date(doc.submitted_at), "PPP")}</TableCell>
                      <TableCell className="text-right"><Badge variant={doc.status === "Approved" ? "default" : doc.status === "Pending" ? "outline" : "destructive"}>{doc.status}</Badge></TableCell>
                    </TableRow>
                  ))
                ) : (<TableRow><TableCell colSpan={3} className="h-24 text-center">No documents submitted yet.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <VideoKyc />
    </div>
  );
};

export default KycDocuments;