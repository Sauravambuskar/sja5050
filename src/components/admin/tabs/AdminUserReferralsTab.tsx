import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, TrendingUp, Link2, Unlink, Loader2 } from "lucide-react";
import { AdminReferralNetworkTable } from "@/components/admin/AdminReferralNetworkTable";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { AdminUserSearch } from "@/components/admin/AdminUserSearch";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminUserReferralsTabProps {
  userId: string;
  onViewUser: (userId: string) => void;
}

interface Referral {
  id: string;
  full_name: string;
  join_date: string;
  kyc_status: string;
  has_invested: boolean;
}

type AdminUserProfileForAdmin = {
  id: string;
  full_name: string | null;
  member_id: string | null;
  referrer_id: string | null;
  referrer_full_name: string | null;
};

const fetchReferralStats = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_user_commission_stats_for_admin', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data;
};

const fetchReferrals = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_user_referrals_for_admin', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data as Referral[];
};

const fetchReferralCode = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_user_referral_code_for_admin', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data as string;
};

const fetchUserProfileForAdmin = async (id: string): Promise<AdminUserProfileForAdmin> => {
  const { data, error } = await supabase.rpc('get_user_profile_for_admin', { user_id_to_fetch: id });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('User not found');
  return {
    id: data[0].id,
    full_name: data[0].full_name,
    member_id: data[0].member_id,
    referrer_id: data[0].referrer_id,
    referrer_full_name: data[0].referrer_full_name,
  };
};

export const AdminUserReferralsTab = ({ userId, onViewUser }: AdminUserReferralsTabProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("direct");

  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<null | { userId: string; name: string }>(null);

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['adminReferralStats', userId],
    queryFn: () => fetchReferralStats(userId),
  });

  const { data: referrals, isLoading: isReferralsLoading } = useQuery({
    queryKey: ['adminReferrals', userId],
    queryFn: () => fetchReferrals(userId),
  });

  const { data: referralCode, isLoading: isReferralCodeLoading } = useQuery({
    queryKey: ['adminReferralCode', userId],
    queryFn: () => fetchReferralCode(userId),
  });

  const { data: candidateProfile, isLoading: isCandidateLoading } = useQuery({
    queryKey: ['adminReferralCandidateProfile', candidateId],
    queryFn: () => fetchUserProfileForAdmin(candidateId!),
    enabled: !!candidateId,
  });

  const candidateLabel = useMemo(() => {
    if (!candidateProfile) return null;
    return `${candidateProfile.full_name || 'User'} (${candidateProfile.member_id || candidateProfile.id})`;
  }, [candidateProfile]);

  const addReferralMutation = useMutation({
    mutationFn: async () => {
      if (!candidateId) throw new Error('Select a user to add.');
      const { error } = await supabase.rpc('admin_set_user_referrer', {
        p_user_id: candidateId,
        p_referrer_id: userId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Referral added successfully');
      setCandidateId(null);
      queryClient.invalidateQueries({ queryKey: ['adminReferrals', userId] });
      queryClient.invalidateQueries({ queryKey: ['adminReferralStats', userId] });
      queryClient.invalidateQueries({ queryKey: ['adminReferralNetwork', userId] });
      queryClient.invalidateQueries({ queryKey: ['adminReferralTree', userId] });
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setConfirmAddOpen(false),
  });

  const removeReferralMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase.rpc('admin_set_user_referrer', {
        p_user_id: targetId,
        p_referrer_id: null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Referral removed');
      queryClient.invalidateQueries({ queryKey: ['adminReferrals', userId] });
      queryClient.invalidateQueries({ queryKey: ['adminReferralStats', userId] });
      queryClient.invalidateQueries({ queryKey: ['adminReferralNetwork', userId] });
      queryClient.invalidateQueries({ queryKey: ['adminReferralTree', userId] });
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setConfirmRemove(null),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/referral-management?userId=${userId}`}>Open Referral Tree</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Add Referral</CardTitle>
          <CardDescription>
            Add any existing user under this sponsor instantly. This updates the main database, so it syncs across the entire system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <AdminUserSearch onUserSelect={(id) => setCandidateId(id)} />
            <Button
              disabled={!candidateId || addReferralMutation.isPending}
              onClick={() => setConfirmAddOpen(true)}
            >
              {addReferralMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Add Under This User
            </Button>
          </div>

          {candidateId && (
            <div className="rounded-md border p-3 text-sm">
              {isCandidateLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <div className="space-y-1">
                  <div className="font-medium">Selected: {candidateLabel}</div>
                  {candidateProfile?.referrer_id ? (
                    <div className="text-muted-foreground">
                      Current sponsor: {candidateProfile.referrer_full_name || candidateProfile.referrer_id}
                      <span className="ml-2 text-xs text-destructive">(will be moved)</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">Current sponsor: None</div>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Safety rules are enforced: no self-sponsor and no circular referral loops.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.[0]?.total_referrals || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">₹{(stats?.[0]?.total_commission_earned || 0).toLocaleString('en-IN')}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referral Code</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isReferralCodeLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{referralCode || 'N/A'}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="direct">Direct Clients</TabsTrigger>
          <TabsTrigger value="network">Client Network</TabsTrigger>
        </TabsList>
        <TabsContent value="direct" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Direct Clients</CardTitle>
            </CardHeader>
            <CardContent>
              {isReferralsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : referrals && referrals.length > 0 ? (
                <div className="space-y-2">
                  {referrals.map((referral: Referral) => (
                    <div key={referral.id} className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{referral.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(referral.join_date).toLocaleDateString()} • {referral.kyc_status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => onViewUser(referral.id)}>
                          View Client
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setConfirmRemove({ userId: referral.id, name: referral.full_name })}
                          disabled={removeReferralMutation.isPending}
                        >
                          {removeReferralMutation.isPending && confirmRemove?.userId === referral.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Unlink className="mr-2 h-4 w-4" />
                          )}
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No direct clients found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="network" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Network</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminReferralNetworkTable userId={userId} onViewUser={onViewUser} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmAddOpen} onOpenChange={setConfirmAddOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm add referral</AlertDialogTitle>
            <AlertDialogDescription>
              {candidateProfile ? (
                <>
                  You are about to add <strong>{candidateProfile.full_name || 'User'}</strong> under this sponsor.
                  {candidateProfile.referrer_id && (
                    <div className="mt-2 text-sm">
                      This will move them from <strong>{candidateProfile.referrer_full_name || candidateProfile.referrer_id}</strong>.
                    </div>
                  )}
                </>
              ) : (
                'You are about to add the selected user under this sponsor.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => addReferralMutation.mutate()} disabled={addReferralMutation.isPending}>
              {addReferralMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove referral</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{confirmRemove?.name}</strong> from this sponsor? They will have no sponsor after this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemove && removeReferralMutation.mutate(confirmRemove.userId)}
              disabled={removeReferralMutation.isPending}
            >
              {removeReferralMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};