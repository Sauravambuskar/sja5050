import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet as WalletIcon, Loader2, Landmark, History } from "lucide-react";
import ManualDeposit from "@/components/wallet/ManualDeposit";
import WithdrawalRequests from "@/components/wallet/WithdrawalRequests";
import DepositHistory from "@/components/wallet/DepositHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalanceTransfer } from "@/components/wallet/BalanceTransfer";

const fetchWalletBalance = async () => {
  const { data, error } = await supabase.rpc('get_my_wallet_balance');
  if (error) throw new Error(error.message);
  return data;
};

const Wallet = () => {
  const { data: balance, isLoading } = useQuery<number>({
    queryKey: ['walletBalance'],
    queryFn: fetchWalletBalance,
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Wallet</h1>
      </div>
      <p className="text-muted-foreground">
        Manage your funds, make deposits, and request withdrawals.
      </p>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Available Balance</CardTitle>
            <CardDescription>The funds available for investing or withdrawal.</CardDescription>
          </div>
          <div className="text-3xl font-bold text-primary flex items-center gap-2">
            <WalletIcon className="h-8 w-8" />
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <span>₹{balance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}</span>
            )}
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="add_funds" className="w-full mt-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="add_funds">Add Funds</TabsTrigger>
          <TabsTrigger value="transfer">Balance Transfer</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawal History</TabsTrigger>
          <TabsTrigger value="deposits">Deposit History</TabsTrigger>
        </TabsList>
        <TabsContent value="add_funds">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Landmark />
                <CardTitle>Add Funds to Wallet</CardTitle>
              </div>
              <CardDescription>
                Deposit funds manually via bank transfer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ManualDeposit />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="transfer">
          <BalanceTransfer />
        </TabsContent>
        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History />
                <CardTitle>Withdrawal History</CardTitle>
              </div>
              <CardDescription>Track your withdrawal requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <WithdrawalRequests />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="deposits">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History />
                <CardTitle>Deposit History</CardTitle>
              </div>
              <CardDescription>Track your deposit requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <DepositHistory />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Wallet;