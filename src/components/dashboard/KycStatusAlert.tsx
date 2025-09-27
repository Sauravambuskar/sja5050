import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface KycStatusAlertProps {
  kycStatus: string | null | undefined;
}

export function KycStatusAlert({ kycStatus }: KycStatusAlertProps) {
  if (!kycStatus || kycStatus === 'Approved') {
    return null;
  }

  const statusConfig = {
    'Not Submitted': {
      variant: 'default',
      icon: AlertCircle,
      title: 'Complete Your KYC',
      description: 'Please complete your KYC verification to access all features.',
      buttonText: 'Start KYC',
    },
    'Pending': {
      variant: 'default',
      icon: Clock,
      title: 'KYC Under Review',
      description: 'Your documents have been submitted and are pending review.',
      buttonText: 'View Status',
    },
    'Rejected': {
      variant: 'destructive',
      icon: AlertCircle,
      title: 'KYC Rejected',
      description: 'There was an issue with your KYC documents. Please review and resubmit.',
      buttonText: 'Review KYC',
    },
  };

  const config = statusConfig[kycStatus as keyof typeof statusConfig];

  if (!config) return null;

  return (
    <Alert variant={config.variant as any} className="flex items-center justify-between">
      <div className="flex items-center">
        <config.icon className="h-5 w-5 mr-3" />
        <div>
          <AlertTitle>{config.title}</AlertTitle>
          <AlertDescription>{config.description}</AlertDescription>
        </div>
      </div>
      <Button asChild>
        <Link to="/profile?tab=kyc">{config.buttonText}</Link>
      </Button>
    </Alert>
  );
}