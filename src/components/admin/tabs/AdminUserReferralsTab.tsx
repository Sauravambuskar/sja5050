import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminReferralTree } from "@/components/admin/AdminReferralTree";

export const AdminUserReferralsTab = ({ userId }: { userId: string }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User's Referral Network</CardTitle>
        <CardDescription>A tree view of this user's multi-level referral network.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminReferralTree userId={userId} />
      </CardContent>
    </Card>
  );
};