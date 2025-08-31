import { Profile, DashboardStats } from "@/types/database";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight, CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GettingStartedGuideProps {
  profile: Profile;
  stats: DashboardStats;
}

export const GettingStartedGuide = ({ profile, stats }: GettingStartedGuideProps) => {
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

  const completenessChecks = [
    { key: 'full_name', label: 'Add your full name', tab: 'personal' },
    { key: 'phone', label: 'Add your phone number', tab: 'personal' },
    { key: 'dob', label: 'Add your date of birth', tab: 'personal' },
    { key: 'address', label: 'Add your full address', tab: 'personal' },
    { key: 'bank_account_number', label: 'Add your bank details', tab: 'bank' },
    { key: 'kyc_status', label: 'Complete KYC verification', tab: 'kyc', check: (val: any) => val === 'Approved' },
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
                  <Circle className="h-6 w-6 mr-4 text-muted-foreground" />
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