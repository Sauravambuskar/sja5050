import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface AdminUserReferralsTabProps {
  userId: string;
}

export function AdminUserReferralsTab({ userId }: AdminUserReferralsTabProps) {
  const { data: referrals, isLoading } = useQuery({
    queryKey: ['userReferrals', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_referral_tree_for_admin', { p_user_id: userId });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!referrals || referrals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Referral Tree</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">This user has no referrals.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referral Tree</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Has Invested</TableHead>
                <TableHead>Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map((ref: any) => (
                <TableRow key={ref.id}>
                  <TableCell>{ref.full_name}</TableCell>
                  <TableCell>{new Date(ref.join_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={ref.kyc_status === 'Approved' ? 'default' : 'outline'}>
                      {ref.kyc_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ref.has_invested ? 'default' : 'outline'}>
                      {ref.has_invested ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>{ref.level}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}