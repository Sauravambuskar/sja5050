import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvestmentPlans from "@/components/investments/InvestmentPlans";
import InvestmentHistory from "@/components/investments/InvestmentHistory";
import InvestmentSummary from "@/components/investments/InvestmentSummary";
import { InvestmentWithdrawalRequests } from "@/components/investments/InvestmentWithdrawalRequests";
import { RequestWithdrawalForm } from "@/components/investments/RequestWithdrawalForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader2 } from "lucide-react";
import { SignAgreementPrompt } from "@/components/investments/SignAgreementPrompt";
import { History, DollarSign } from "lucide-react";
import { useSearchParams } from "react-router-dom";

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
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'portfolio';

  const { data: signedAgreement, isLoading } = useQuery({
    queryKey: ['investmentAgreementCheck', user?.id],
    queryFn: () => fetchAgreement(user!.id),
    enabled: !!user,
  });

  return (
    <div className="space-y-8">
      <InvestmentSummary />
      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plans">Investment Plans</TabsTrigger>
          <TabsTrigger value="history">My Investments</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Available Investment Plans</CardTitle>
              <CardDescription>Choose a plan that suits your financial goals.</CardDescription>
            </CardHeader>
            <CardContent>
              <InvestmentPlans />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Your Investment History</CardTitle>
              <CardDescription>A complete record of all your past and present investments.</CardDescription>
            </CardHeader>
            <CardContent>
              <InvestmentHistory />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="withdrawals">
          <div className="space-y-6">
            <RequestWithdrawalForm />
            <InvestmentWithdrawalRequests />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Investments;