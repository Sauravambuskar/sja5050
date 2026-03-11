import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Share2, TableProperties, Network } from "lucide-react";
import ReferralNetworkTable from "@/components/referrals/ReferralNetworkTable";
import CommissionAnalytics from "@/components/referrals/CommissionAnalytics";
import ReferralCode from "@/components/referrals/ReferralCode";
import ReferralClientLedgerTable from "@/components/referrals/ReferralClientLedgerTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile } from "@/hooks/useProfile";

const fetchReferralStats = async () => {
  const { data, error } = await supabase.rpc("get_my_commission_stats");
  if (error) throw new Error(error.message);
  return data;
};

const fetchReferralClientLedger = async () => {
  const { data, error } = await supabase.rpc("get_my_referral_client_ledger");
  if (error) throw new Error(error.message);
  return data || [];
};

export default function Referrals() {
  const profileQuery = useProfile();
  const [activeTab, setActiveTab] = useState("ledger");

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["referralStats"],
    queryFn: fetchReferralStats,
  });

  const referralLink = useMemo(() => {
    const code = profileQuery.data?.referral_code;
    return code ? `${window.location.origin}/register?ref=${code}` : "";
  }, [profileQuery.data?.referral_code]);

  const handleShare = async () => {
    if (!referralLink) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join with my referral link",
          text: "Use my referral link to register.",
          url: referralLink,
        });
        return;
      }

      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied to clipboard!");
    } catch {
      toast.error("Unable to share referral link right now.");
    }
  };

  return (
    <div className="container mx-auto space-y-8 p-4 md:p-6 lg:p-8">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-orange-400 p-6 text-primary-foreground shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Referrals</h1>
            <p className="mt-2 text-primary-foreground/90">
              Live referral client data synced with your real clients, investments, commissions, and network.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void handleShare()} disabled={!referralLink}>
              <Share2 className="mr-2 h-4 w-4" />
              Share Link
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats?.[0]?.total_referrals || 0}</div>}
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
              <div className="text-2xl font-bold">₹{(stats?.[0]?.total_commission_earned || 0).toLocaleString("en-IN")}</div>
            )}
          </CardContent>
        </Card>
        <ReferralCode />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:w-auto">
          <TabsTrigger value="ledger">
            <TableProperties className="mr-2 h-4 w-4" />
            Client Ledger
          </TabsTrigger>
          <TabsTrigger value="network">
            <Network className="mr-2 h-4 w-4" />
            Network
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-4">
          <ReferralClientLedgerTable
            queryKey={["myReferralClientLedger"]}
            queryFn={fetchReferralClientLedger}
            title="Client Referral Ledger"
            description="Direct client investments synced from the main system."
            emptyMessage="No direct client investments found yet."
          />
        </TabsContent>

        <TabsContent value="network" className="mt-4">
          <ReferralNetworkTable />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <CommissionAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
