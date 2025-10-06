import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { keepTrying } from "@/lib/utils";
import { Download, X, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";

interface KycRequest {
  request_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  document_type: string;
  file_path: string;
  submitted_at: string;
  status: string;
  admin_notes: string | null;
}

interface KycViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: KycRequest | null;
}

export const KycViewerDialog = ({ isOpen, onClose, request }: KycViewerDialogProps) => {
  const { data: imageUrl, isLoading } = useQuery({
    queryKey: ['kycImage', request?.file_path],
    queryFn: async () => {
      if (!request?.file_path) return null;
      const { data } = await keepTrying(() => 
        supabase.storage.from('kyc_documents').createSignedUrl(request.file_path, 3600)
      );
      return data?.signedUrl || null;
    },
    enabled: !!request?.file_path && isOpen,
  });

  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${request?.user_name}_${request?.document_type}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>KYC Document Viewer</DialogTitle>
          <DialogDescription>View and manage KYC document submissions</DialogDescription>
        </DialogHeader>
        
        {request && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{request.user_name}</span>
                  <span className="text-muted-foreground">({request.user_email})</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{request.document_type}</span>
                  <Calendar className="h-4 w-4 ml-2" />
                  <span>{format(new Date(request.submitted_at), "PPP")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={request.status === "Approved" ? "default" : request.status === "Pending" ? "outline" : "destructive"}>
                  {request.status}
                </Badge>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={`${request.document_type} for ${request.user_name}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-2" />
                    <p>Unable to load document</p>
                  </div>
                </div>
              )}
            </div>

            {request.admin_notes && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Admin Notes:</p>
                <p className="text-sm text-muted-foreground">{request.admin_notes}</p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={handleDownload} disabled={!imageUrl}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};