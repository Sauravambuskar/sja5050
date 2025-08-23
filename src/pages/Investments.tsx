import InvestmentPlans from "@/components/investments/InvestmentPlans";
import InvestmentHistory from "@/components/investments/InvestmentHistory";

const Investments = () => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Investments</h1>
      </div>
      <p className="text-muted-foreground">
        Deposit into our exclusive plan and manage your investment portfolio.
      </p>

      <div className="mt-6 space-y-8">
        <InvestmentPlans />
        <InvestmentHistory />
      </div>
    </>
  );
};
export default Investments;