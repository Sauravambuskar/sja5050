import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Transaction } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ITEMS_PER_PAGE = 10;

const fetchTransactions = async (page: number): Promise<Transaction[]> => {
  const { data, error } = await supabase.rpc('get_my_transactions', {
    page_limit: ITEMS_PER_PAGE,
    page_offset: (page - 1) * ITEMS_PER_PAGE,
  });
  if (error) throw new Error(error.message);
  return data as Transaction[];
};

const fetchTransactionsCount = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('get_my_transactions_count').single();
  if (error) throw new Error(error.message);
  return data as number;
};

export default function Transactions() {
  const [currentPage, setCurrentPage] = useState(1);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ['myTransactions', currentPage],
    queryFn: () => fetchTransactions(currentPage),
  });

  const { data: totalCount } = useQuery<number>({
    queryKey: ['myTransactionsCount'],
    queryFn: fetchTransactionsCount,
  });

  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

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
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : transactions?.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.created_at).toLocaleString()}</TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell>{tx.type}</TableCell>
                  <TableCell className={`text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount >= 0 ? '+' : ''}₹{tx.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
        />
      </CardContent>
    </Card>
  );
}