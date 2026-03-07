import InvestmentPlans from "@/components/investments/InvestmentPlans";
import InvestmentHistory from "@/components/investments/InvestmentHistory";
import InvestmentSummary from "@/components/investments/InvestmentSummary";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import InvestmentWithdrawalsPage from "@/pages/Withdrawals";

const fetchAgreement = async (userId: string) => {
  const { data, error } = await supabase
    .from('investment_agreements')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

const Investments = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "plans";

  const { data: signedAgreement, isLoading } = useQuery({
    queryKey: ['investmentAgreementCheck', user?.id],
    queryFn: () => fetchAgreement(user!.id),
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Investments</h1>
      </div>
      <p className="text-muted-foreground">
        Deposit into our exclusive plan and manage your investment portfolio.
      </p>

      <div className="mt-6 space-y-8">
        <InvestmentSummary />
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = new URLSearchParams(searchParams);
              next.set('tab', v);
              setSearchParams(next);
            }}
            className="w-full mt-6"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="plans">Investment Plans</TabsTrigger>
              <TabsTrigger value="history">My Investments</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            </TabsList>
            <TabsContent value="plans">
              <InvestmentPlans canInvest={!!signedAgreement} />
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <History />
                    <CardTitle>My Investment History</CardTitle>
                  </div>
                  <CardDescription>Track your active, matured, and withdrawn investments.</CardDescription>
                </CardHeader>
                <CardContent>
                  <InvestmentHistory />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="withdrawals">
              <InvestmentWithdrawalsPage />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Investments;