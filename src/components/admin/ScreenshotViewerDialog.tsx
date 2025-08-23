import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AdminDepositRequest } from "@/types/database";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ScreenshotViewerDialogProps {
  request: AdminDepositRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ScreenshotViewerDialog = ({ request, isOpen, onClose }: ScreenshotViewerDialogProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  useEffect(() => {
    if (isOpen && request && request.screenshot_path) {
      const getSignedUrl = async () => {
        setIsLoadingUrl(true);
        setSignedUrl(null);
        const { data, error } = await supabase.storage
          .from('deposit_proofs')
          .createSignedUrl(request.screenshot_path!, 300); // URL valid for 5 minutes

        if (error) {
          toast.error("Could not load screenshot preview.");
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment Proof</DialogTitle>
          <DialogDescription>
            For deposit request from {request.user_name}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 min-h-[200px] flex items-center justify-center">
          {isLoadingUrl ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : signedUrl ? (
            <img src={signedUrl} alt="Payment Screenshot" className="w-full h-auto rounded-md" />
          ) : (
            <p className="text-muted-foreground">No screenshot provided or could not be loaded.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};