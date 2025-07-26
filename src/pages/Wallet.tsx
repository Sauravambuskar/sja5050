import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

const transactions = [
  { id: "TXN001", type: "Deposit", amount: "₹10,000", date: "2024-08-02", status: "Completed" },
  { id: "TXN002", type: "Withdrawal", amount: "₹2,500", date: "2024-08-01", status: "Completed" },
  { id: "TXN003", type: "Commission", amount: "₹500", date: "2024-08-01", status: "Credited" },
  { id: "TXN004", type: "Investment", amount: "₹50,000", date: "2024-07-30", status: "Debited" },
];

const fetchWalletBalance = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('get_my_wallet_balance');
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const Wallet = () => {
  const { data: balance, isLoading, isError, error } = useQuery<number>({
    queryKey: ['walletBalance'],
    queryFn: fetchWalletBalance,
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Wallet</h1>
      </div>
      <p className="text-muted-foreground">
        Manage your balance, view transactions, and deposit funds.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Available Balance</CardTitle>
                    <CardDescription>This is the amount you can withdraw or invest.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-10 w-3/4" />
                    ) : isError ? (
                      <div className="text-destructive">Error loading balance</div>
                    ) : (
                      <div className="text-4xl font-bold">
                        ₹{balance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                    <div className="mt-4 flex space-x-2">
                        <Button><ArrowDown className="mr-2 h-4 w-4" /> Deposit</Button>
                        <Button variant="outline"><ArrowUp className="mr-2 h-4 w-4" /> Withdraw</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>A record of all your wallet activities.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                            <TableCell className="font-medium">{txn.type}</TableCell>
                            <TableCell>{txn.amount}</TableCell>
                            <TableCell>{txn.date}</TableCell>
                            <TableCell className="text-right">
                            <Badge variant={txn.status === "Completed" || txn.status === "Credited" ? "default" : "secondary"}>
                                {txn.status}
                            </Badge>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
};

export default Wallet;