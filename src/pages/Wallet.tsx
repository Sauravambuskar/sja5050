import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet as WalletIcon, Loader2 } from "lucide-react";
import WithdrawalRequests from "@/components/wallet/WithdrawalRequests";

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

      <WithdrawalRequests />
    </>
  );
};

export default Wallet;