import { Profile, DashboardStats } from "@/types/database";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface GettingStartedGuideProps {
  profile: Profile;
  stats: DashboardStats;
}

export const GettingStartedGuide = ({ profile, stats }: GettingStartedGuideProps) => {
  const { data: profileData, isLoading } = useProfile(); // Fix: Destructure 'data' instead of 'profile'

  if (isLoading) {
    return null;
  }

  const steps = [
    {
      title: "Complete Your Profile",
      description: "Fill in your personal, bank, and nominee details.",
      isComplete: !!(profile.phone && profile.address && profile.bank_account_number),
      link: "/profile",
    },
    {
      title: "Verify Your Identity (KYC)",
      description: "Upload your documents to get your account fully verified.",
      isComplete: profile.kyc_status === 'Approved',
      link: "/profile?tab=kyc",
    },
    {
      title: "Add Funds to Your Wallet",
      description: "Make your first deposit to start investing.",
      isComplete: stats.walletBalance > 0,
      link: "/wallet?tab=deposit",
    },
    {
      title: "Make Your First Investment",
      description: "Choose a plan and put your funds to work.",
      isComplete: stats.totalInvested > 0,
      link: "/investments",
    },
  ];

  const completedSteps = steps.filter(step => step.isComplete).length;
  const completionPercentage = Math.round((completedSteps / steps.length) * 100);

  if (completionPercentage === 100) {
    return null;
  }

  const completenessChecksList = [
    { name: "Personal Details", completed: !!(profile.full_name && profile.phone && profile.dob), link: "/profile?tab=personal" },
    { name: "Bank Details", completed: !!(profile.bank_account_number && profile.bank_ifsc_code), link: "/profile?tab=bank" },
    { name: "KYC Details", completed: !!(profile.pan_number && profile.aadhaar_number), link: "/profile?tab=kyc" },
    { name: "KYC Documents", completed: profile.kyc_status === 'Approved', link: "/profile?tab=kyc-documents" },
  ];

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '';
    const words = name.split(' ');
    return words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0][0];
  };

  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle>Getting Started</CardTitle>
        <CardDescription>
          Welcome! Complete these steps to get your account fully set up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <Progress value={completionPercentage} className="w-full" />
          <span className="text-sm font-semibold text-muted-foreground">{completionPercentage}%</span>
        </div>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <Link 
              key={index} 
              to={step.link} 
              className={cn(
                "flex items-center justify-between rounded-md border p-4 transition-colors",
                step.isComplete ? "bg-muted/50 text-muted-foreground" : "hover:bg-accent"
              )}
            >
              <div className="flex items-center">
                {step.isComplete ? (
                  <CheckCircle className="h-6 w-6 mr-4 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 mr-4 text-muted-foreground" />
                )}
                <div>
                  <p className={cn("font-semibold", !step.isComplete && "text-primary")}>{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {!step.isComplete && <ArrowRight className="h-5 w-5 text-primary" />}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};