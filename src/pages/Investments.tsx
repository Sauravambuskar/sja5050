import InvestmentPlans from "@/components/investments/InvestmentPlans";
import InvestmentHistory from "@/components/investments/InvestmentHistory";
import InvestmentSummary from "@/components/investments/InvestmentSummary";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader2 } from "lucide-react";
import { SignAgreementPrompt } from "@/components/investments/SignAgreementPrompt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestmentWithdrawal } from "@/components/investments/InvestmentWithdrawal";
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
    <>
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
        ) : signedAgreement ? (
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="plans">Investment Plans</TabsTrigger>
            </TabsList>
            <TabsContent value="portfolio">
              <InvestmentHistory />
            </TabsContent>
            <TabsContent value="plans">
              <InvestmentPlans />
            </TabsContent>
          </Tabs>
        ) : (
          <SignAgreementPrompt />
        )}
      </div>
    </>
  );
};
export default Investments;