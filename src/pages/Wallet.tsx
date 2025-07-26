import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowRightLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction } from "@/types/database";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const fetchWalletBalance = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('get_my_wallet_balance');
  if (error) throw new Error(error.message);
  return data;
};

const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase.rpc('get_my_transactions');
  if (error) throw new Error(error.message);
  return data;
};

const Wallet = () => {
  const { data: balance, isLoading: isBalanceLoading } = useQuery<number>({
    queryKey: ['walletBalance'],
    queryFn: fetchWalletBalance,
  });

  const { data: transactions, isLoading: areTransactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
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
                    {isBalanceLoading ? (
                      <Skeleton className="h-10 w-3/4" />
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
                          <TableHead className="w-[50px] text-center">Type</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {areTransactionsLoading ? (
                          [...Array(4)].map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></TableCell>
                              <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : transactions && transactions.length > 0 ? (
                          transactions.map((txn) => (
                            <TableRow key={txn.id}>
                              <TableCell>
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{txn.type}</div>
                                <div className="text-sm text-muted-foreground">{format(new Date(txn.created_at), "PPP p")}</div>
                              </TableCell>
                              <TableCell className={cn("text-right font-semibold", txn.type === 'Investment' ? 'text-destructive' : 'text-green-600')}>
                                {txn.type === 'Investment' ? '-' : '+'} ₹{txn.amount.toLocaleString('en-IN')}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center h-24">No transactions yet.</TableCell>
                          </TableRow>
                        )}
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