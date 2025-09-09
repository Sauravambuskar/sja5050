import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedWithdrawalsTab } from "@/components/admin/requests/UnifiedWithdrawalsTab";

const WithdrawalManagement = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawal Management</CardTitle>
        <CardDescription>
          Process withdrawal requests from user wallets and investments. Approved requests are final.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UnifiedWithdrawalsTab />
      </CardContent>
    </Card>
  );
};

export default WithdrawalManagement;