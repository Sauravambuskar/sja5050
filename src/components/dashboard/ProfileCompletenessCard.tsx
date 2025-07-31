import { Profile } from "@/types/database";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";

interface ProfileCompletenessCardProps {
  profile: Profile;
}

const completenessChecks = [
  { key: 'kyc_status', label: 'Complete KYC verification', tab: 'kyc', check: (val: any) => val === 'Approved' },
  { key: 'bank_account_number', label: 'Add your bank details for withdrawals', tab: 'bank' },
  { key: 'phone', label: 'Add your phone number', tab: 'personal' },
  { key: 'address', label: 'Add your full address', tab: 'personal' },
  { key: 'nominee_name', label: 'Add a nominee for your account', tab: 'nominee' },
  { key: 'dob', label: 'Add your date of birth', tab: 'personal' },
];

export const ProfileCompletenessCard = ({ profile }: ProfileCompletenessCardProps) => {
  const completedItems = completenessChecks.filter(item => {
    const value = profile[item.key as keyof Profile];
    if (item.check) {
      return item.check(value);
    }
    return !!value;
  });

  const incompleteItems = completenessChecks.filter(item => !completedItems.includes(item));
  const completionPercentage = Math.round((completedItems.length / completenessChecks.length) * 100);

  if (completionPercentage === 100) {
    return null;
  }

  let nextStep = incompleteItems[0];

  // Provide more specific guidance for KYC status
  if (nextStep.key === 'kyc_status') {
    if (profile.kyc_status === 'Rejected') {
      nextStep = { ...nextStep, label: 'KYC Rejected: Please review and resubmit.' };
    } else if (profile.kyc_status === 'Pending Review') {
      nextStep = { ...nextStep, label: 'Your KYC is currently under review.' };
    }
  }

  return (
    <Card className="my-6 bg-accent/50 border-primary/20">
      <CardHeader>
        <CardTitle>Let's Complete Your Profile</CardTitle>
        <CardDescription>
          Your profile is {completionPercentage}% complete. Finish the next step to secure your account and enable all features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={completionPercentage} className="mb-4" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Next Step:</p>
            <p className="text-sm text-muted-foreground">{nextStep.label}</p>
          </div>
          {profile.kyc_status !== 'Pending Review' && (
            <Button asChild size="sm">
              <Link to={`/profile?tab=${nextStep.tab}`}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};