import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveInvestmentsForWithdrawal } from './ActiveInvestmentsForWithdrawal';
import { WithdrawalRequestHistory } from './WithdrawalRequestHistory';

const InvestmentWithdrawals = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Request Investment Withdrawal</CardTitle>
          <CardDescription>
            You can request to withdraw an active investment before its maturity date. Please note that withdrawals are subject to approval and may result in forfeiture of earned profits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActiveInvestmentsForWithdrawal />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Request History</CardTitle>
          <CardDescription>
            Track the status of your past and pending investment withdrawal requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WithdrawalRequestHistory />
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentWithdrawals;