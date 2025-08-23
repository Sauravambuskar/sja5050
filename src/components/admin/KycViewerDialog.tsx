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

const STORAGE_URL = "https://lqlvkyuyrwsmstooqbed.supabase.co/storage/v1/object/public/kyc_documents/";

interface KycViewerDialogProps {
  request: AdminKycRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const KycViewerDialog = ({ request, isOpen, onClose }: KycViewerDialogProps) => {
  if (!request) return null;

  const fileUrl = `${STORAGE_URL}${request.file_path}`;
  const fileExtension = request.file_path.split('.').pop()?.toLowerCase();

  const renderContent = () => {
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExtension || '')) {
      return <img src={fileUrl} alt={request.document_type} className="w-full h-auto rounded-md" />;
    }
    if (['webm', 'mp4', 'ogg'].includes(fileExtension || '')) {
      return <video src={fileUrl} controls autoPlay className="w-full rounded-md" />;
    }
    if (fileExtension === 'pdf') {
      return <iframe src={fileUrl} className="w-full h-[70vh] border-0" title={request.document_type} />;
    }
    return (
      <div className="text-center p-4">
        <p>Unsupported file type: .{fileExtension}</p>
        <Button asChild variant="link">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">Open file in new tab</a>
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