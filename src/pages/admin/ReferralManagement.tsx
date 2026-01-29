import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AdminUserSearch } from "@/components/admin/AdminUserSearch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Link2Off, Link2, Users } from "lucide-react";
import { ReferralTreeViewer } from "@/components/admin/referrals/ReferralTreeViewer";
import { AdminReferralNetworkTable } from "@/components/admin/AdminReferralNetworkTable";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchUserBasic(userId: string) {
  const { data, error } = await supabase.rpc('get_user_profile_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('User not found.');
  return data[0] as any;
}

async function fetchSponsorBasic(userId: string) {
  const profile = await fetchUserBasic(userId);
  if (!profile.referrer_id) return null;
  const sponsor = await fetchUserBasic(profile.referrer_id);
  return sponsor;
}

export default function ReferralManagement() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramUserId = searchParams.get('userId');

  const [rootUserId, setRootUserId] = useState<string | null>(paramUserId);
  const [targetUserId, setTargetUserId] = useState<string | null>(paramUserId);
  const [newSponsorId, setNewSponsorId] = useState<string | null>(null);

  const activeUserId = rootUserId;

  const { data: targetUser, isLoading: targetLoading } = useQuery({
    queryKey: ['adminReferralTargetUser', targetUserId],
    queryFn: () => fetchUserBasic(targetUserId!),
    enabled: !!targetUserId,
  });

  const { data: currentSponsor, isLoading: sponsorLoading } = useQuery({
    queryKey: ['adminReferralCurrentSponsor', targetUserId],
    queryFn: () => fetchSponsorBasic(targetUserId!),
    enabled: !!targetUserId,
  });

  const sponsorLabel = useMemo(() => {
    if (!currentSponsor) return 'None';
    return `${currentSponsor.full_name || 'User'} (${currentSponsor.member_id || currentSponsor.id})`;
  }, [currentSponsor]);

  const updateSponsorMutation = useMutation({
    mutationFn: async (payload: { userId: string; sponsorId: string | null }) => {
      const { error } = await supabase.rpc('admin_set_user_referrer', {
        p_user_id: payload.userId,
        p_referrer_id: payload.sponsorId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Referral link updated');
      queryClient.invalidateQueries({ queryKey: ['adminReferralTargetUser'] });
      queryClient.invalidateQueries({ queryKey: ['adminReferralCurrentSponsor'] });
      if (activeUserId) {
        queryClient.invalidateQueries({ queryKey: ['adminReferralTree', activeUserId] });
        queryClient.invalidateQueries({ queryKey: ['adminReferralNetwork', activeUserId] });
      }
      // Invalidate KYC overview/user lists that rely on profile data
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handlePickRoot = (id: string) => {
    setRootUserId(id);
    setTargetUserId(id);
    setNewSponsorId(null);
    setSearchParams({ userId: id });
  };

  const handlePickTarget = (id: string) => {
    setTargetUserId(id);
    setNewSponsorId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Referral Management</h1>
          <p className="text-muted-foreground">Manage sponsor links and inspect referral networks (tree + flat view).</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select a user</CardTitle>
          <CardDescription>Choose a root user to inspect their referral tree/network.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <AdminUserSearch onUserSelect={handlePickRoot} />
          {activeUserId ? (
            <Badge variant="secondary" className="w-fit">Root selected</Badge>
          ) : (
            <Badge variant="outline" className="w-fit">No root selected</Badge>
          )}
        </CardContent>
      </Card>

      {!activeUserId ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Select a user to start managing referrals.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Tabs defaultValue="tree">
              <TabsList>
                <TabsTrigger value="tree">Tree</TabsTrigger>
                <TabsTrigger value="network">Network List</TabsTrigger>
              </TabsList>
              <TabsContent value="tree" className="mt-4">
                <ReferralTreeViewer
                  rootUserId={activeUserId}
                  onSelectTarget={(id) => handlePickTarget(id)}
                />
              </TabsContent>
              <TabsContent value="network" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" /> Full Network
                    </CardTitle>
                    <CardDescription>Flat list of everyone in the downline (all levels).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AdminReferralNetworkTable userId={activeUserId} onViewUser={(id) => handlePickTarget(id)} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Sponsor Link</CardTitle>
                <CardDescription>Set or remove the sponsor (referrer) for any user.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Target user</p>
                  <AdminUserSearch onUserSelect={(id) => handlePickTarget(id)} />
                  {targetUserId ? (
                    <div className="rounded-md border p-3 text-sm">
                      {targetLoading ? (
                        <Skeleton className="h-4 w-40" />
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{targetUser?.full_name || 'User'}</span>
                            <Badge variant="outline">{targetUser?.member_id || targetUserId}</Badge>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Current sponsor</span>
                            <span className="font-medium">
                              {sponsorLoading ? 'Loading…' : sponsorLabel}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Pick a target user to manage.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">New sponsor (optional)</p>
                  <AdminUserSearch onUserSelect={(id) => setNewSponsorId(id)} />
                  {newSponsorId && (
                    <p className="text-xs text-muted-foreground">Selected sponsor user ID: {newSponsorId}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!targetUserId || !newSponsorId || updateSponsorMutation.isPending}
                    onClick={() => updateSponsorMutation.mutate({ userId: targetUserId!, sponsorId: newSponsorId! })}
                  >
                    {updateSponsorMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                    Set Sponsor
                  </Button>

                  <Button
                    variant="destructive"
                    disabled={!targetUserId || updateSponsorMutation.isPending}
                    onClick={() => updateSponsorMutation.mutate({ userId: targetUserId!, sponsorId: null })}
                  >
                    {updateSponsorMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2Off className="mr-2 h-4 w-4" />}
                    Remove Sponsor
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Safety: circular links are blocked (you can’t make a user sponsor themselves or create a loop).
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
