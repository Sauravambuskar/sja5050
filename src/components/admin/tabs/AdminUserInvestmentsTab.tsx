import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminUserInvestmentHistoryItem } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ReduceInvestmentDialog } from "@/components/admin/dialogs/ReduceInvestmentDialog";
import { Badge } from "@/components/ui/badge";

const fetchUserInvestmentHistory = async (userId: string): Promise<AdminUserInvestmentHistoryItem[]> => {
  const { data, error } = await supabase.rpc('get_user_investment_history_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  return data;
};

export const AdminUserInvestmentsTab = ({ userId }: { userId: string }) => {
  const [selectedInvestment, setSelectedInvestment] = useState<AdminUserInvestmentHistoryItem | null>(null);
  const [isReduceDialogOpen, setIsReduceDialogOpen] = useState(false);

  const { data: investments, isLoading: areInvestmentsLoading } = useQuery({
    queryKey: ['userInvestmentHistory', userId],
    queryFn: () => fetchUserInvestmentHistory(userId),
    enabled: !!userId,
  });

  const handleReduceClick = (investment: AdminUserInvestmentHistoryItem) => {
    setSelectedInvestment(investment);
    setIsReduceDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader><CardTitle>Investment History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areInvestmentsLoading ? (
                [...Array(2)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : investments && investments.length > 0 ? (
                investments.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.plan_name}</TableCell>
                    <TableCell>{format(new Date(inv.start_date), "PPP")}</TableCell>
                    <TableCell><Badge variant={inv.status === "Active" ? "success" : "secondary"}>{inv.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono">₹{inv.investment_amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">
                      {inv.status === 'Active' && (
                        <Button size="sm" variant="outline" onClick={() => handleReduceClick(inv)}>
                          Reduce
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No investments found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ReduceInvestmentDialog
        investment={selectedInvestment}
        userId={userId}
        isOpen={isReduceDialogOpen}
        onOpenChange={setIsReduceDialogOpen}
      />
    </>
  );
};