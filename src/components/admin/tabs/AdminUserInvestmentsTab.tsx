import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminUserInvestmentHistoryItem } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

const fetchUserInvestmentHistory = async (userId: string): Promise<AdminUserInvestmentHistoryItem[]> => {
  const { data, error } = await supabase.rpc('get_user_investment_history_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  return data;
};

export const AdminUserInvestmentsTab = ({ userId }: { userId: string }) => {
  const { data: investments, isLoading: areInvestmentsLoading } = useQuery({
    queryKey: ['userInvestmentHistory', userId],
    queryFn: () => fetchUserInvestmentHistory(userId),
    enabled: !!userId,
  });

  return (
    <Card>
      <CardHeader><CardTitle>Investment History</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Start Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>
            {areInvestmentsLoading ? (
              [...Array(2)].map((_, i) => (
                <TableRow key={i}><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell></TableRow>
              ))
            ) : investments && investments.length > 0 ? (
              investments.map((inv) => (
                <TableRow key={inv.id}><TableCell>{inv.plan_name}</TableCell><TableCell>{format(new Date(inv.start_date), "PPP")}</TableCell><TableCell className="text-right font-mono">₹{inv.investment_amount.toLocaleString('en-IN')}</TableCell></TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={3} className="h-24 text-center">No investments found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};