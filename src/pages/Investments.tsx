import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvestmentPlans from "@/components/investments/InvestmentPlans";
import InvestmentHistory from "@/components/investments/InvestmentHistory";
import WithdrawalRequests from "@/components/investments/WithdrawalRequests";

const Investments = () => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Investments</h1>
      </div>
      <p className="text-muted-foreground">
        Browse plans, manage your portfolio, and make withdrawal requests.
      </p>

      <Tabs defaultValue="plans" className="mt-6">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="plans">Investment Plans</TabsTrigger>
          <TabsTrigger value="history">My Investments</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>
        <TabsContent value="plans">
          <InvestmentPlans />
        </TabsContent>
        <TabsContent value="history">
          <InvestmentHistory />
        </TabsContent>
        <TabsContent value="withdrawals">
          <WithdrawalRequests />
        </TabsContent>
      </Tabs>
    </>
  );
};
export default Investments;