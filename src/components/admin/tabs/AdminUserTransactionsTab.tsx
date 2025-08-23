import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Transaction } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowRightLeft } from "lucide-react";

const fetchUserTransactions = async (userId: string): Promise<Transaction[]> => {
  const { data, error } = await supabase.rpc('get_user_transactions_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  return data;
};

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'Deposit': case 'Commission': case 'Adjustment (Credit)': return <ArrowDown className="h-4 w-4 text-green-500" />;
    case 'Withdrawal': case 'Investment': case 'Adjustment (Debit)': return <ArrowUp className="h-4 w-4 text-red-500" />;
    default: return <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />;
  }
};

export const AdminUserTransactionsTab = ({ userId }: { userId: string }) => {
  const { data: transactions, isLoading: areTransactionsLoading } = useQuery({
    queryKey: ['userTransactionHistory', userId],
    queryFn: () => fetchUserTransactions(userId),
    enabled: !!userId,
  });

  return (
    <Card>
      <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead className="w-[50px]"></TableHead><TableHead>Details</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>
            {areTransactionsLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}><TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell></TableRow>
              ))
            ) : transactions && transactions.length > 0 ? (
              transactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell><div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">{getTransactionIcon(txn.type)}</div></TableCell>
                  <TableCell><div className="font-medium">{txn.description || txn.type}</div><div className="text-xs text-muted-foreground">{format(new Date(txn.created_at), "PPP")}</div></TableCell>
                  <TableCell className="text-right font-mono">₹{txn.amount.toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={3} className="h-24 text-center">No transactions found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};