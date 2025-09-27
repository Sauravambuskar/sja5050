import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { Profile } from '@/types/database';

interface AdminUserProfileTabProps {
  userId: string;
}

export function AdminUserProfileTab({ userId }: AdminUserProfileTabProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_profile_for_admin', { user_id_to_fetch: userId })
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!profile) {
    return <div className="text-center text-destructive">Failed to load profile.</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Profile</CardTitle>
          <Button onClick={() => setIsEditDialogOpen(true)}>Edit Profile</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Full Name</p>
              <p className="text-lg">{profile.full_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg">{profile.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p className="text-lg">{profile.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">KYC Status</p>
              <p className="text-lg">{profile.kyc_status || 'Not Submitted'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Role</p>
              <p className="text-lg">{profile.role}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Referral Code</p>
              <p className="text-lg">{profile.referral_code || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditUserDialog
        user={profile as any}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
      />
    </div>
  );
}