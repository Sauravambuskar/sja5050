import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminReferralNetworkTable } from "@/components/admin/AdminReferralNetworkTable";

interface AdminUserReferralsTabProps {
  userId: string;
  onViewUser: (userId: string) => void;
}

export const AdminUserReferralsTab = ({ userId, onViewUser }: AdminUserReferralsTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User's Referral Network</CardTitle>
        <CardDescription>A table view of this user's multi-level referral network.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminReferralNetworkTable userId={userId} onViewUser={onViewUser} />
      </CardContent>
    </Card>
  );
};