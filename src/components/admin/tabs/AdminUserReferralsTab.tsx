import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, TrendingUp } from "lucide-react";
import { AdminReferralNetworkTable } from "@/components/admin/AdminReferralNetworkTable";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminUserReferralsTabProps {
  userId: string;
  onViewUser: (userId: string) => void;
}

const fetchReferralStats = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_my_commission_stats', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data;
};

const fetchReferrals = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_my_referrals', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data;
};

export const AdminUserReferralsTab = ({ userId, onViewUser }: AdminUserReferralsTabProps) => {
  const [activeTab, setActiveTab] = useState("direct");

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['adminReferralStats', userId],
    queryFn: () => fetchReferralStats(userId),
  });

  const { data: referrals, isLoading: isReferralsLoading } = useQuery({
    queryKey: ['adminReferrals', userId],
    queryFn: () => fetchReferrals(userId),
  });

  return (
    <div className="space-y-6">
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
            {isReferralsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{referrals?.[0]?.referral_code || 'N/A'}</div>
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
                  {referrals.map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{referral.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(referral.join_date).toLocaleDateString()} • {referral.kyc_status}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => onViewUser(referral.id)}>
                        View Client
                      </Button>
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
    </div>
  );
};