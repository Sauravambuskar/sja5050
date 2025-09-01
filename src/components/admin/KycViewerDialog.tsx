import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AdminKycRequest } from "@/types/database";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface KycViewerDialogProps {
  request: AdminKycRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const KycViewerDialog = ({ request, isOpen, onClose }: KycViewerDialogProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  useEffect(() => {
    if (isOpen && request) {
      const getSignedUrl = async () => {
        setIsLoadingUrl(true);
        setSignedUrl(null);
        const { data, error } = await supabase.storage
          .from('kyc_documents')
          .createSignedUrl(request.file_path, 300); // URL valid for 5 minutes

        if (error) {
          toast.error("Could not load document preview.");
          console.error(error);
        } else {
          setSignedUrl(data.signedUrl);
        }
        setIsLoadingUrl(false);
      };
      getSignedUrl();
    }
  }, [isOpen, request]);

  if (!request) return null;

  const fileExtension = request.file_path.split('.').pop()?.toLowerCase();

  const renderContent = () => {
    if (isLoadingUrl) {
      return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    if (!signedUrl) {
      return <div className="text-center p-4 text-destructive">Could not load document.</div>;
    }

    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExtension || '')) {
      return <img src={signedUrl} alt={request.document_type} className="w-full h-auto rounded-md" />;
    }
    if (['webm', 'mp4', 'ogg'].includes(fileExtension || '')) {
      return <video src={signedUrl} controls autoPlay className="w-full rounded-md" />;
    }
    if (fileExtension === 'pdf') {
      return <iframe src={signedUrl} className="w-full h-[70vh] border-0" title={request.document_type} />;
    }
    return (
      <div className="text-center p-4">
        <p>Unsupported file type: .{fileExtension}</p>
        <Button asChild variant="link">
          <a href={signedUrl} target="_blank" rel="noopener noreferrer">Open file in new tab</a>
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reviewing: {request.document_type}</DialogTitle>
          <DialogDescription>
            For user: {request.user_name}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {renderContent()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};