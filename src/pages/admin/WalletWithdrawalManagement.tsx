import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletWithdrawalsTab } from "@/components/admin/requests/WalletWithdrawalsTab";

const WalletWithdrawalManagement = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Withdrawal Management</CardTitle>
        <CardDescription>
          Process requests from users to withdraw funds from their wallet to their bank account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <WalletWithdrawalsTab />
      </CardContent>
    </Card>
  );
};

export default WalletWithdrawalManagement;