import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestmentWithdrawalsTab } from "@/components/admin/requests/InvestmentWithdrawalsTab";

const FundTransferApproval = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fund Transfer Approval</CardTitle>
        <CardDescription>
          Process requests from users to withdraw funds from their investments to their bank account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InvestmentWithdrawalsTab />
      </CardContent>
    </Card>
  );
};

export default FundTransferApproval;