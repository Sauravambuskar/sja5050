import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, TrendingUp, Share2 } from "lucide-react";
import ReferralNetworkTable from "@/components/referrals/ReferralNetworkTable";
import CommissionAnalytics from "@/components/referrals/CommissionAnalytics";
import ReferralCode from "@/components/referrals/ReferralCode";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile } from "@/hooks/useProfile";

interface Referral {
  id: string;
  full_name: string;
  join_date: string;
  kyc_status: string;
}

const fetchReferralStats = async () => {
  const { data, error } = await supabase.rpc('get_my_commission_stats');
  if (error) throw new Error(error.message);
  return data;
};

const fetchReferrals = async () => {
  const { data, error } = await supabase.rpc('get_my_referrals');
  if (error) throw new Error(error.message);
  return data as Referral[];
};

export default function Referrals() {
  const profileQuery = useProfile();
  const [activeTab, setActiveTab] = useState("direct");

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['referralStats'],
    queryFn: fetchReferralStats,
  });

  const { data: referrals, isLoading: isReferralsLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: fetchReferrals,
  });

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Clients</h1>
          <p className="text-muted-foreground">
            View your client network and track your referral earnings.
          </p>
        </div>
        <ReferralCode />
      </div>

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
            <CardTitle className="text-sm font-medium">Share Referral</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled={!profileQuery.data?.referral_code}>
              Share Link
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="direct">Direct Clients</TabsTrigger>
          <TabsTrigger value="network">Client Network</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                    <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{referral.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(referral.join_date).toLocaleDateString()} • {referral.kyc_status}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
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
              <ReferralNetworkTable />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <CommissionAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}