import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositRequestsTab } from "@/components/admin/requests/DepositRequestsTab";
import { WithdrawalRequestsTab } from "@/components/admin/requests/WithdrawalRequestsTab";
import { InvestmentWithdrawalRequestsTab } from "@/components/admin/requests/InvestmentWithdrawalRequestsTab";
import { useAdminActionCounts } from "@/hooks/useAdminActionCounts";
import { Badge } from "@/components/ui/badge";

const RequestManagement = () => {
  const { pendingDepositsCount, pendingWithdrawalsCount, pendingInvestmentWithdrawalsCount } = useAdminActionCounts();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Management</CardTitle>
        <CardDescription>Process all pending financial requests from this unified dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deposits">
          <TabsList className="grid w-full grid-cols-1 h-auto sm:grid-cols-3">
            <TabsTrigger value="deposits" className="py-2.5">
              Deposits
              {pendingDepositsCount > 0 && <Badge className="ml-2">{pendingDepositsCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="py-2.5">
              Withdrawals
              {pendingWithdrawalsCount > 0 && <Badge className="ml-2">{pendingWithdrawalsCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="investment-withdrawals" className="py-2.5">
              Investment Withdrawals
              {pendingInvestmentWithdrawalsCount > 0 && <Badge className="ml-2">{pendingInvestmentWithdrawalsCount}</Badge>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="deposits" className="mt-4">
            <DepositRequestsTab />
          </TabsContent>
          <TabsContent value="withdrawals" className="mt-4">
            <WithdrawalRequestsTab />
          </TabsContent>
          <TabsContent value="investment-withdrawals" className="mt-4">
            <InvestmentWithdrawalRequestsTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RequestManagement;