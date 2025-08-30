import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositRequestsTab } from "@/components/admin/requests/DepositRequestsTab";
import { WithdrawalRequestsTab } from "@/components/admin/requests/WithdrawalRequestsTab";
import { InvestmentWithdrawalRequestsTab } from "@/components/admin/requests/InvestmentWithdrawalRequestsTab";
import { useAdminActionCounts } from "@/hooks/useAdminActionCounts";
import { Badge } from "@/components/ui/badge";
import { ArrowDownToDot, Banknote, TrendingDown } from "lucide-react";

const RequestManagement = () => {
  const { pendingDepositsCount, pendingWithdrawalsCount, pendingInvestmentWithdrawalsCount } = useAdminActionCounts();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Management</CardTitle>
        <CardDescription>Process all pending financial requests from this unified dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deposits" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deposits">
              <ArrowDownToDot className="mr-2 h-4 w-4" />
              Deposit Requests
            </TabsTrigger>
            <TabsTrigger value="withdrawals">
              <Banknote className="mr-2 h-4 w-4" />
              Wallet Withdrawals
            </TabsTrigger>
            <TabsTrigger value="investment-withdrawals">
              <TrendingDown className="mr-2 h-4 w-4" />
              Investment Withdrawals
            </TabsTrigger>
          </TabsList>
          <TabsContent value="deposits">
            <Card>
              <CardHeader>
                <CardTitle>Deposit Requests</CardTitle>
                <CardDescription>Approve or reject user deposit requests.</CardDescription>
              </CardHeader>
              <CardContent>
                <DepositRequestsTab />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>Wallet Withdrawal Requests</CardTitle>
                <CardDescription>Process user requests to withdraw funds from their wallet.</CardDescription>
              </CardHeader>
              <CardContent>
                <WithdrawalRequestsTab />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="investment-withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>Investment Withdrawal Requests</CardTitle>
                <CardDescription>Process user requests to withdraw an active investment.</CardDescription>
              </CardHeader>
              <CardContent>
                <InvestmentWithdrawalRequestsTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RequestManagement;