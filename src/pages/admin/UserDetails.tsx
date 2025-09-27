import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminUserProfileTab } from '@/components/admin/tabs/AdminUserProfileTab';
import { AdminUserInvestmentsTab } from '@/components/admin/tabs/AdminUserInvestmentsTab';
import { AdminUserTransactionsTab } from '@/components/admin/tabs/AdminUserTransactionsTab';
import { AdminUserReferralsTab } from '@/components/admin/tabs/AdminUserReferralsTab';
import { AdminUserKycTab } from '@/components/admin/tabs/AdminUserKycTab';
import { AdminUserNotesTab } from '@/components/admin/tabs/AdminUserNotesTab';
import { AdminWalletAdjustmentTab } from '@/components/admin/tabs/AdminWalletAdjustmentTab';
import { AdminUserDocumentsTab } from '@/components/admin/tabs/AdminUserDocumentsTab';

const fetchUserDetails = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase
    .rpc('get_user_profile_for_admin', { user_id_to_fetch: userId })
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
};

export default function UserDetails() {
  const { userId } = useParams<{ userId: string }>();

  const { data: user, isLoading, error } = useQuery<Profile>({
    queryKey: ['userDetails', userId],
    queryFn: () => fetchUserDetails(userId!),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !user) {
    return <div className="text-center text-destructive">Failed to load user details.</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{user?.full_name || 'User Details'}</h1>
      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><AdminUserProfileTab userId={userId!} /></TabsContent>
        <TabsContent value="investments"><AdminUserInvestmentsTab userId={userId!} /></TabsContent>
        <TabsContent value="transactions"><AdminUserTransactionsTab userId={userId!} /></TabsContent>
        <TabsContent value="referrals"><AdminUserReferralsTab userId={userId!} /></TabsContent>
        <TabsContent value="kyc"><AdminUserKycTab userId={userId!} /></TabsContent>
        <TabsContent value="notes"><AdminUserNotesTab userId={userId!} /></TabsContent>
        <TabsContent value="wallet"><AdminWalletAdjustmentTab userId={userId!} /></TabsContent>
        <TabsContent value="documents"><AdminUserDocumentsTab userId={userId!} /></TabsContent>
      </Tabs>
    </div>
  );
}