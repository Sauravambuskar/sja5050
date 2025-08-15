import { Profile } from "@/types/database";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "../auth/AuthProvider";
import { Badge } from "../ui/badge";

interface ProfileStatusProps {
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

const getInitials = (name: string | null | undefined) => {
  if (!name) return "U";
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

export const ProfileStatus = ({ profile }: ProfileStatusProps) => {
  const { user } = useAuth();

  const completedItems = completenessChecks.filter(item => {
    const value = profile[item.key as keyof Profile];
    if (item.check) {
      return item.check(value);
    }
    return !!value;
  });

  const incompleteItems = completenessChecks.filter(item => !completedItems.includes(item));
  const completionPercentage = Math.round((completedItems.length / completenessChecks.length) * 100);

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <Avatar className="h-24 w-24 mb-4">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback className="text-3xl">{getInitials(profile.full_name)}</AvatarFallback>
        </Avatar>
        <CardTitle>{profile.full_name}</CardTitle>
        <CardDescription>Member ID: {profile.member_id}</CardDescription>
        <Badge variant={profile.kyc_status === 'Approved' ? 'default' : 'outline'} className="mt-2">
          KYC: {profile.kyc_status}
        </Badge>
      </CardHeader>
      {completionPercentage < 100 && (
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">Profile Completeness: {completionPercentage}%</p>
            <Progress value={completionPercentage} className="mb-4" />
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
      )}
    </Card>
  );
};

export default ProfileStatus;