import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WithdrawalRequestsTab } from "@/components/admin/requests/WithdrawalRequestsTab";
import { InvestmentWithdrawalRequestsTab } from "@/components/admin/requests/InvestmentWithdrawalRequestsTab";

const WithdrawalManagement = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Withdrawal Management</h1>
          <p className="text-muted-foreground">
            Review and process all user withdrawal requests.
          </p>
        </div>
      </div>

      <Tabs defaultValue="wallet" className="w-full mt-6">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="wallet">Wallet Withdrawals</TabsTrigger>
          <TabsTrigger value="investment">Investment Withdrawals</TabsTrigger>
        </TabsList>
        <TabsContent value="wallet" className="mt-4">
          <WithdrawalRequestsTab initialStatus={status} />
        </TabsContent>
        <TabsContent value="investment" className="mt-4">
          <InvestmentWithdrawalRequestsTab initialStatus={status} />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default WithdrawalManagement;