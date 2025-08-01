import { Profile } from "@/types/database";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface ProfileCompletenessProps {
  profile: Profile;
}

const completenessChecks = [
  { key: 'full_name', label: 'Add your full name', tab: 'personal' },
  { key: 'phone', label: 'Add your phone number', tab: 'personal' },
  { key: 'dob', label: 'Add your date of birth', tab: 'personal' },
  { key: 'address', label: 'Add your full address', tab: 'personal' },
  { key: 'bank_account_number', label: 'Add your bank details', tab: 'bank' },
  { key: 'nominee_name', label: 'Add a nominee', tab: 'nominee' },
  { key: 'kyc_status', label: 'Complete KYC verification', tab: 'kyc', check: (val: any) => val === 'Approved' },
];

export const ProfileCompleteness = ({ profile }: ProfileCompletenessProps) => {
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
    return null; // Don't show the card if profile is complete
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Complete Your Profile</CardTitle>
        <CardDescription>
          Your profile is {completionPercentage}% complete. Complete the following steps to secure your account and enable all features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={completionPercentage} className="mb-4" />
        <div className="space-y-2">
          <p className="text-sm font-medium">To-Do List:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {incompleteItems.map(item => (
              <li key={item.key}>
                <Link to={`/profile?tab=${item.tab}`} className="text-primary hover:underline inline-flex items-center">
                  {item.label}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};