import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvestmentPlans from "@/components/investments/InvestmentPlans";
import InvestmentHistory from "@/components/investments/InvestmentHistory";

const Investments = () => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Investments</h1>
      </div>
      <p className="text-muted-foreground">
        Browse plans and manage your investment portfolio.
      </p>

      <Tabs defaultValue="plans" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 md:w-[300px]">
          <TabsTrigger value="plans">Investment Plans</TabsTrigger>
          <TabsTrigger value="history">My Investments</TabsTrigger>
        </TabsList>
        <TabsContent value="plans">
          <InvestmentPlans />
        </TabsContent>
        <TabsContent value="history">
          <InvestmentHistory />
        </TabsContent>
      </Tabs>
    </>
  );
};
export default Investments;