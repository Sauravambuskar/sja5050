import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface AdminUserInvestmentsTabProps {
  userId: string;
}

export function AdminUserInvestmentsTab({ userId }: AdminUserInvestmentsTabProps) {
  const { data: investments, isLoading } = useQuery({
    queryKey: ['userInvestments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_investment_history_for_admin', { user_id_to_fetch: userId });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!investments || investments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No investments found for this user.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.plan_name}</TableCell>
                  <TableCell>₹{inv.investment_amount.toLocaleString()}</TableCell>
                  <TableCell>{new Date(inv.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === 'Active' ? 'default' : 'outline'}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}