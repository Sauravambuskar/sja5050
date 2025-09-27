import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AdminUserTransactionsTabProps {
  userId: string;
}

export function AdminUserTransactionsTab({ userId }: AdminUserTransactionsTabProps) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['userTransactions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_transactions_for_admin', { user_id_to_fetch: userId });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No transactions found for this user.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx: any) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.created_at).toLocaleString()}</TableCell>
                  <TableCell>{tx.type}</TableCell>
                  <TableCell>₹{tx.amount.toLocaleString()}</TableCell>
                  <TableCell>{tx.status}</TableCell>
                  <TableCell>{tx.description || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}