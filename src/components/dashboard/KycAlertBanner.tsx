import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

interface KycAlertBannerProps {
  status: string | null | undefined;
}

export const KycAlertBanner = ({ status }: KycAlertBannerProps) => {
  if (!status || status === 'Approved' || status === 'Not Submitted') {
    return null;
  }

  let title = "Verification Required";
  let description = "Please complete your KYC verification to unlock all features, including withdrawals.";

  if (status === 'Pending Review') {
    title = "KYC Under Review";
    description = "Your documents have been submitted and are currently being reviewed. This may take up to 48 hours.";
  } else if (status === 'Rejected') {
    title = "KYC Action Required";
    description = "Your KYC submission was rejected. Please review the notes on your documents and resubmit.";
  }

  return (
    <Alert className="my-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{description}</span>
        <Button asChild size="sm" className="ml-4 flex-shrink-0">
          <Link to="/profile?tab=kyc">Go to KYC</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
};